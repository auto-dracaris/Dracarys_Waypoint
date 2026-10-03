import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EntityManager } from 'typeorm';
import { MAX_OTP_ATTEMPTS } from '../../common/constants/otp.constant';
import { SmsService } from '../../common/sms/sms.service';
import { minuteOfDay } from '../../common/utils/date.util';
import { Outlet } from '../../database/entities/outlet.entity';
import { TripStop } from '../../database/entities/trip-stop.entity';
import { Trip } from '../../database/entities/trip.entity';
import { UserOtp } from '../../database/entities/user-otp.entity';
import { OtpPurpose } from '../auth/enums/otp-purpose.enum';
import { UserOtpRepository } from '../auth/repositories/user-otp.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import {
  DeliveryCodeHash,
  hashDeliveryCode,
  matchesDeliveryCode,
  newCode,
  parseDeliveryCodeHash,
  storeDeliveryCodeHash,
} from './trip-codes.util';

const BCRYPT_ROUNDS = 10;
const HOUR_MS = 60 * 60 * 1000;

// A dispatch code is good until the vehicle would have left; a delivery code
// for as long as a trip could still be on the road and syncing.
const DISPATCH_CODE_TTL_MS = 24 * HOUR_MS;
const DELIVERY_CODE_TTL_MS = 48 * HOUR_MS;

/** A stop to issue a delivery code for: an outlet and the trip's rows for it. */
export interface CodeStop {
  outlet: Outlet;
  rows: TripStop[];
}

/** What a trip's delivery codes say about each stop, keyed by outlet id. */
export interface StopCodeState {
  // The unused code's hash, for the driver's handset to check against.
  hash: DeliveryCodeHash | null;
  // Whether the stop was completed with its code.
  verified: boolean;
}

const hhmm = (instant: Date): string => {
  const minutes = minuteOfDay(instant);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/**
 * The two codes that confirm a handover. A **dispatch code** passes from the
 * loader to the driver and starts the trip. A **delivery code** per stop goes
 * to the outlet by SMS and is entered by the driver there; its hash travels
 * with the trip so the handset can check it with no signal.
 */
@Injectable()
export class TripCodesService {
  constructor(
    private readonly otpRepository: UserOtpRepository,
    private readonly usersRepository: UsersRepository,
    private readonly smsService: SmsService,
  ) {}

  /**
   * A new dispatch code for a loaded trip, replacing any earlier one. It is
   * returned for the loader's screen and texted to the trip's driver.
   */
  async issueDispatchCode(
    trip: Trip,
    manager?: EntityManager,
  ): Promise<string> {
    const code = newCode();
    const driverId = trip.driverId ?? trip.vehicle?.driverId ?? null;
    await this.otpRepository.deleteUnusedForTrip(
      trip.id,
      OtpPurpose.CONFIRM_DISPATCH,
      undefined,
      manager,
    );
    await this.otpRepository.save(
      this.otpRepository.create({
        userId: driverId,
        tripId: trip.id,
        purpose: OtpPurpose.CONFIRM_DISPATCH,
        otpHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + DISPATCH_CODE_TTL_MS),
      }),
      manager,
    );
    return code;
  }

  async sendDispatchCode(trip: Trip, code: string): Promise<void> {
    const driverId = trip.driverId ?? trip.vehicle?.driverId;
    const driver = driverId
      ? await this.usersRepository.findById(driverId)
      : null;
    if (driver?.phone) {
      await this.smsService.sendSms(
        driver.phone,
        `Waypoint: ${trip.vehicle?.uniqueId ?? 'your vehicle'} is loaded. Your start code is ${code}.`,
      );
    }
  }

  /**
   * Checks the code the driver entered to start the trip and returns its row,
   * to be marked used with the start. A wrong one counts against the code,
   * which is void after too many.
   */
  async verifyDispatchCode(tripId: string, code: string): Promise<UserOtp> {
    const otp = this.active(
      await this.otpRepository.findForTrip(tripId, OtpPurpose.CONFIRM_DISPATCH),
    )[0];
    if (!otp) {
      throw new BadRequestException(
        'There is no valid start code. Ask the loader for a new one',
      );
    }
    if (!(await bcrypt.compare(code, otp.otpHash))) {
      await this.countWrongGuess(otp);
      throw new BadRequestException('Invalid start code');
    }
    return otp;
  }

  /**
   * A delivery code for each stop, replacing unused earlier ones. The plain
   * codes are returned, keyed by outlet id, to be texted; only hashes are kept.
   */
  async issueDeliveryCodes(
    trip: Trip,
    stops: CodeStop[],
    manager?: EntityManager,
  ): Promise<Map<number, string>> {
    const codes = new Map<number, string>();
    for (const stop of stops) {
      const code = newCode();
      await this.otpRepository.deleteUnusedForTrip(
        trip.id,
        OtpPurpose.CONFIRM_DELIVERY,
        stop.rows.map((row) => row.id),
        manager,
      );
      await this.otpRepository.save(
        this.otpRepository.create({
          userId: null,
          tripId: trip.id,
          // A stop is several order rows; the code hangs off the first.
          tripStopId: stop.rows[0].id,
          purpose: OtpPurpose.CONFIRM_DELIVERY,
          otpHash: storeDeliveryCodeHash(await hashDeliveryCode(code)),
          expiresAt: new Date(Date.now() + DELIVERY_CODE_TTL_MS),
        }),
        manager,
      );
      codes.set(stop.outlet.id, code);
    }
    return codes;
  }

  /**
   * Texts each stop's code to the outlet's store managers, or to the outlet's
   * contact phone when it has none, with when to expect the vehicle.
   */
  async sendDeliveryCodes(
    trip: Trip,
    stops: CodeStop[],
    codes: Map<number, string>,
  ): Promise<void> {
    const managers = await this.usersRepository.findStoreManagersOfOutlets(
      stops.map((stop) => stop.outlet.id),
    );
    for (const stop of stops) {
      const code = codes.get(stop.outlet.id);
      if (!code) {
        continue;
      }
      const phones = managers
        .filter((manager) => manager.outletId === stop.outlet.id)
        .map((manager) => manager.phone);
      const recipients = phones.length
        ? phones
        : [stop.outlet.contactPhone].filter(
            (phone): phone is string => !!phone,
          );
      for (const phone of new Set(recipients)) {
        await this.smsService.sendSms(
          phone,
          `Waypoint delivery arriving about ${hhmm(stop.rows[0].plannedArrivalAt)} on ${trip.vehicle?.uniqueId ?? 'our vehicle'}. Give the driver code ${code}.`,
        );
      }
    }
  }

  /**
   * Checks the code the driver was given at a stop and returns its row, to be
   * marked used with the completion.
   */
  async verifyDeliveryCode(
    tripId: string,
    rows: TripStop[],
    code: string,
  ): Promise<UserOtp> {
    const rowIds = new Set(rows.map((row) => row.id));
    const otp = this.active(
      await this.otpRepository.findForTrip(tripId, OtpPurpose.CONFIRM_DELIVERY),
    ).find((candidate) => rowIds.has(candidate.tripStopId!));
    if (!otp || !(await matchesDeliveryCode(code, otp.otpHash))) {
      if (otp) {
        await this.countWrongGuess(otp);
      }
      throw new BadRequestException('Invalid delivery code');
    }
    return otp;
  }

  async markUsed(otp: UserOtp, manager: EntityManager): Promise<void> {
    otp.usedAt = new Date();
    await this.otpRepository.save(otp, manager);
  }

  /** Each stop's code state, keyed by the id of the stop's first row. */
  async deliveryCodeStates(
    tripId: string,
  ): Promise<Map<string, StopCodeState>> {
    const otps = await this.otpRepository.findForTrip(
      tripId,
      OtpPurpose.CONFIRM_DELIVERY,
    );
    const live = new Set(this.active(otps));
    const states = new Map<string, StopCodeState>();
    for (const otp of otps) {
      const state = states.get(otp.tripStopId!) ?? {
        hash: null,
        verified: false,
      };
      if (otp.usedAt) {
        state.verified = true;
      } else if (live.has(otp)) {
        state.hash = parseDeliveryCodeHash(otp.otpHash);
      }
      states.set(otp.tripStopId!, state);
    }
    return states;
  }

  /** Codes that can still be used: not used, not expired, not guessed out. */
  private active(otps: UserOtp[]): UserOtp[] {
    const now = Date.now();
    return otps.filter(
      (otp) =>
        !otp.usedAt &&
        otp.expiresAt.getTime() > now &&
        otp.attempts < MAX_OTP_ATTEMPTS,
    );
  }

  private async countWrongGuess(otp: UserOtp): Promise<void> {
    otp.attempts += 1;
    await this.otpRepository.save(otp);
  }
}
