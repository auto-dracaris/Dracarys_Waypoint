import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// The driver's picture, or their initials on the brand yellow when there is
/// none (or it cannot be loaded).
class DriverAvatar extends StatelessWidget {
  const DriverAvatar({
    super.key,
    required this.initials,
    this.url,
    this.bytes,
    this.size = 88,
  });

  final String initials;
  final String? url;

  /// A picture just chosen, shown before it is uploaded. Wins over [url].
  final ImageProvider? bytes;
  final double size;

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      color: AppColors.brandYellow,
      child: Text(
        initials,
        style: AppText.displayXs.copyWith(
          color: AppColors.vehicleText,
          fontSize: size * 0.34,
        ),
      ),
    );
    final image =
        bytes ?? (url == null || url!.isEmpty ? null : NetworkImage(url!));
    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: image == null
            ? fallback
            : Image(
                key: const Key('avatar-image'),
                image: image,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => fallback,
              ),
      ),
    );
  }
}
