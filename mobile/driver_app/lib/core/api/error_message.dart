import 'package:flutter/material.dart';

import 'api_exception.dart';

/// What to tell the driver when a call fails: the API's own message when it
/// gave one (it is written for people), otherwise a generic line.
String errorMessage(Object error) {
  if (error is ApiException) return error.message;
  if (error is StateError) return error.message;
  return 'Something went wrong. Please try again.';
}

void showErrorSnack(BuildContext context, Object error) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(errorMessage(error))));
}
