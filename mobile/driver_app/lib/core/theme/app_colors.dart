import 'package:flutter/material.dart';

/// Colour tokens, taken from the Figma variables (WayPoint file).
abstract final class AppColors {
  // Brand
  static const primary = Color(0xFFFACC15); // yellow/400 — buttons
  static const brandYellow = Color(0xFFFFCB06); // vehicle banner
  static const yellow100 = Color(0xFFFEF9C3); // active tab indicator
  static const yellow200 = Color(0xFFFEF08A); // "loading" strip

  // Text
  static const ink = Color(0xFF2B2422); // text/primary
  static const onPrimary = ink;
  static const inkSecondary = Color(0xFF5B4F4B); // text/secondary
  static const inkMuted = Color(0xFF737373); // text/tertiary
  static const vehicleText = Color(0xFF1D1D1A);

  // Surfaces
  static const background = Color(0xFFF5F5F5);
  static const surface = Color(0xFFFFFFFF);
  static const card = Color(0xFFFAFAFA); // text/white
  static const border = Color(0xFFE5E5E5); // neutral/200
  static const divider = Color(0xFFEEEEEE);
  static const navBorder = Color(0xFFE3E3E3);

  static const inkFaint = Color(0xFFA3A3A3); // text/quaternary
  static const outfitInk = Color(0xFF10141E);
  static const sectionLabel = Color(0xFF596070);

  // Notification card palettes
  static const red50 = Color(0xFFFEF2F2);
  static const red100 = Color(0xFFFEE2E2);
  static const red500 = Color(0xFFEF4444);
  static const red700 = Color(0xFFB91C1C);
  static const yellow50 = Color(0xFFFEFCE8);
  static const yellow300 = Color(0xFFFDE047);
  static const yellow600 = Color(0xFFCA8A04);
  static const orange50 = Color(0xFFFFF7ED);
  static const gray50 = Color(0xFFF9FAFB);
  static const green50 = Color(0xFFF0FDF4);
  static const green600 = Color(0xFF16A34A);

  static const lime200 = Color(0xFFD9F99D);
  static const lime300 = Color(0xFFBEF264);
  static const lime500 = Color(0xFF84CC16);
  static const blue100 = Color(0xFFDBEAFE);
  static const blue700 = Color(0xFF1D4ED8);
  static const mapRoute = Color(0xFF365314); // lime/900 route line
  static const red200 = Color(0xFFFECACA);
  static const lime50 = Color(0xFFF7FEE7);
  static const neutral600 = Color(0xFF525252);
  static const yellow700 = Color(0xFFA16207);
  static const blue800 = Color(0xFF1E40AF);
  static const neutral300 = Color(0xFFD4D4D4);
  static const errorPrimary = Color(0xFFDC2626);
  static const lime800 = Color(0xFF3F6212);
  static const backLink = Color(0xFF1A1A1A);

  // Status
  static const lime100 = Color(0xFFECFCCB);
  static const lime700 = Color(0xFF4D7C0F);
  static const success = lime700;
  static const successBg = lime100;
  static const danger = Color(0xFFD93A3A);
  static const dangerBg = Color(0xFFF6DAD8);
  static const warning = Color(0xFF7A5F00);
  static const warningBg = yellow200;
}
