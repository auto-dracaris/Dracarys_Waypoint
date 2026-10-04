import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/connectivity/online_provider.dart';
import '../../../core/format.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../application/chat_controller.dart';
import '../domain/chat_message.dart';
import 'widgets/message_text.dart';

/// What a driver is most likely to want to ask, one tap away.
const chatSuggestions = [
  (Icons.near_me_rounded, "What's my next stop?"),
  (Icons.alt_route_rounded, 'Has my route changed?'),
  (Icons.inventory_2_outlined, 'How do I report damaged goods?'),
  (Icons.verified_outlined, 'What counts as proof of delivery?'),
];

/// Chat with the Waypoint assistant: questions about the driver's trips and
/// the delivery rules, answered by the AI service.
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _toBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send([String? text]) async {
    final value = text ?? _input.text;
    if (value.trim().isEmpty || ref.read(chatControllerProvider).sending) {
      return;
    }
    _input.clear();
    setState(() {});
    final done = ref.read(chatControllerProvider.notifier).send(value);
    _toBottom();
    await done;
    _toBottom();
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatControllerProvider);
    final online = ref.watch(onlineProvider);

    ref.listen(chatControllerProvider, (prev, next) {
      if ((prev?.messages.length ?? 0) != next.messages.length) _toBottom();
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _TopBar(
            sending: chat.sending,
            canReset: !chat.isEmpty,
            onBack: () =>
                context.canPop() ? context.pop() : context.go('/trips'),
            onNewChat: () async {
              await ref.read(chatControllerProvider.notifier).newChat();
              _input.clear();
            },
          ),
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => _focus.unfocus(),
              child: chat.isEmpty && !chat.sending
                  ? _Welcome(onPick: _send, enabled: online)
                  : ListView(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
                      children: [
                        for (var i = 0; i < chat.messages.length; i++)
                          _Bubble(
                            message: chat.messages[i],
                            showTime:
                                i == chat.messages.length - 1 ||
                                chat.messages[i + 1].role !=
                                    chat.messages[i].role,
                            onRetry:
                                chat.messages[i].failed &&
                                    i == chat.messages.length - 1
                                ? () => ref
                                      .read(chatControllerProvider.notifier)
                                      .retry()
                                : null,
                          ),
                        if (chat.sending) const _TypingBubble(),
                      ],
                    ),
            ),
          ),
          if (!online) const _OfflineNotice(),
          _Composer(
            controller: _input,
            focusNode: _focus,
            enabled: online,
            sending: chat.sending,
            onSend: _send,
            onChanged: () => setState(() {}),
          ),
        ],
      ),
    );
  }
}

class _BotAvatar extends StatelessWidget {
  const _BotAvatar({this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('bot-avatar'),
    width: size,
    height: size,
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [AppColors.brandYellow, AppColors.primary],
      ),
    ),
    child: Icon(
      Icons.auto_awesome_rounded,
      size: size * 0.5,
      color: AppColors.ink,
    ),
  );
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.sending,
    required this.canReset,
    required this.onBack,
    required this.onNewChat,
  });

  final bool sending;
  final bool canReset;
  final VoidCallback onBack;
  final VoidCallback onNewChat;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 10),
          child: Row(
            children: [
              IconButton(
                key: const Key('chat-back'),
                tooltip: 'Back',
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: onBack,
              ),
              const _BotAvatar(size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Waypoint Assistant', style: AppText.textMdSemibold),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      child: Row(
                        key: ValueKey(sending),
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: sending
                                  ? AppColors.yellow600
                                  : AppColors.lime500,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            sending ? 'Thinking…' : 'Trips & delivery help',
                            key: const Key('assistant-status'),
                            style: AppText.textXsRegular.copyWith(
                              color: AppColors.inkSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (canReset)
                IconButton(
                  key: const Key('chat-new'),
                  tooltip: 'New chat',
                  icon: const Icon(Icons.edit_square),
                  onPressed: onNewChat,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome({required this.onPick, required this.enabled});

  final ValueChanged<String> onPick;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 16),
      child: Column(
        children: [
          const _BotAvatar(size: 72),
          const SizedBox(height: 16),
          Text(
            'How can I help?',
            key: const Key('chat-welcome'),
            style: AppText.displayXs,
          ),
          const SizedBox(height: 6),
          Text(
            'Ask about your trips and stops, route changes, or the delivery '
            'rules. I can read your trips but I can\'t change anything.',
            textAlign: TextAlign.center,
            style: AppText.textSmRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
          const SizedBox(height: 24),
          for (final (icon, text) in chatSuggestions)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Material(
                color: AppColors.surface,
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: AppColors.border),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: InkWell(
                  key: Key('suggestion-$text'),
                  borderRadius: BorderRadius.circular(14),
                  onTap: enabled ? () => onPick(text) : null,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 14,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: AppColors.yellow100,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(icon, size: 19, color: AppColors.ink),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(text, style: AppText.textSmSemibold),
                        ),
                        const Icon(
                          Icons.arrow_upward_rounded,
                          size: 18,
                          color: AppColors.inkMuted,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.showTime, this.onRetry});

  final ChatMessage message;
  final bool showTime;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final user = message.isUser;
    final failed = message.failed;
    final radius = BorderRadius.only(
      topLeft: const Radius.circular(20),
      topRight: const Radius.circular(20),
      bottomLeft: Radius.circular(user ? 20 : 5),
      bottomRight: Radius.circular(user ? 5 : 20),
    );
    final maxWidth = MediaQuery.of(context).size.width * 0.78;

    final bubble = ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: Container(
        key: Key('chat-message-${message.id}'),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: user
              ? AppColors.primary
              : failed
              ? AppColors.red50
              : AppColors.surface,
          borderRadius: radius,
          border: user
              ? null
              : Border.all(color: failed ? AppColors.red200 : AppColors.border),
          boxShadow: user
              ? null
              : const [
                  BoxShadow(
                    color: Color(0x0F000000),
                    blurRadius: 6,
                    offset: Offset(0, 2),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (failed)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    size: 18,
                    color: AppColors.red700,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      message.text,
                      key: const Key('chat-error'),
                      style: AppText.textSmMedium.copyWith(
                        color: AppColors.red700,
                      ),
                    ),
                  ),
                ],
              )
            else
              MessageText(message.text),
            if (failed && onRetry != null) ...[
              const SizedBox(height: 8),
              InkWell(
                key: const Key('chat-retry'),
                onTap: onRetry,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.refresh_rounded,
                      size: 16,
                      color: AppColors.red700,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Try again',
                      style: AppText.textSmSemibold.copyWith(
                        color: AppColors.red700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: user
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: user
                ? MainAxisAlignment.end
                : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!user) ...[
                const _BotAvatar(size: 28),
                const SizedBox(width: 8),
              ],
              Flexible(child: bubble),
            ],
          ),
          if (!user && message.sources.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 36, top: 6),
              child: _Sources(sources: message.sources),
            ),
          if (showTime)
            Padding(
              padding: EdgeInsets.only(
                top: 4,
                left: user ? 0 : 36,
                right: user ? 4 : 0,
              ),
              child: Text(
                formatTime(message.sentAt),
                style: AppText.textXsRegular.copyWith(
                  color: AppColors.inkMuted,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// The policy passages an answer came from, collapsed under the answer.
class _Sources extends StatefulWidget {
  const _Sources({required this.sources});

  final List<ChatSource> sources;

  @override
  State<_Sources> createState() => _SourcesState();
}

class _SourcesState extends State<_Sources> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final count = widget.sources.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          key: const Key('sources-toggle'),
          borderRadius: BorderRadius.circular(16),
          onTap: () => setState(() => _open = !_open),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.yellow100,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.menu_book_rounded,
                  size: 14,
                  color: AppColors.yellow700,
                ),
                const SizedBox(width: 6),
                Text(
                  '$count ${count == 1 ? 'source' : 'sources'}',
                  style: AppText.textXsSemibold.copyWith(
                    color: AppColors.yellow700,
                  ),
                ),
                Icon(
                  _open ? Icons.expand_less : Icons.expand_more,
                  size: 16,
                  color: AppColors.yellow700,
                ),
              ],
            ),
          ),
        ),
        if (_open)
          for (final (i, s) in widget.sources.indexed)
            Container(
              key: const Key('source-card'),
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    s.page == null
                        ? '${i + 1}. ${s.title}'
                        : '${i + 1}. ${s.title} · p. ${s.page}',
                    style: AppText.textXsSemibold,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    s.text,
                    style: AppText.textXsRegular.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

/// Three dots that rise and fall one after another: the assistant is working.
class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: const Key('typing-indicator'),
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const _BotAvatar(size: 28),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
                bottomRight: Radius.circular(20),
                bottomLeft: Radius.circular(5),
              ),
              border: Border.all(color: AppColors.border),
            ),
            child: AnimatedBuilder(
              animation: _c,
              builder: (_, _) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var i = 0; i < 3; i++)
                    Padding(
                      padding: EdgeInsets.only(right: i == 2 ? 0 : 5),
                      child: Transform.translate(
                        offset: Offset(0, -4 * _wave(_c.value - i * 0.15)),
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.inkMuted.withValues(
                              alpha: 0.4 + 0.5 * _wave(_c.value - i * 0.15),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 0 to 1 and back once per cycle, for the phase [t].
  double _wave(double t) {
    final p = (t % 1 + 1) % 1;
    return p < 0.5 ? p * 2 : (1 - p) * 2;
  }
}

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice();

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('chat-offline'),
    width: double.infinity,
    color: AppColors.yellow50,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    child: Row(
      children: [
        const Icon(
          Icons.cloud_off_rounded,
          size: 16,
          color: AppColors.yellow700,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            'You\'re offline. The assistant needs a connection; your '
            'earlier chat is still here.',
            style: AppText.textXsRegular.copyWith(color: AppColors.ink),
          ),
        ),
      ],
    ),
  );
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.enabled,
    required this.sending,
    required this.onSend,
    required this.onChanged,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final bool sending;
  final Future<void> Function([String?]) onSend;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final canSend = enabled && !sending && controller.text.trim().isNotEmpty;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                key: const Key('chat-input'),
                controller: controller,
                focusNode: focusNode,
                enabled: enabled,
                minLines: 1,
                maxLines: 5,
                maxLength: 2000,
                textCapitalization: TextCapitalization.sentences,
                textInputAction: TextInputAction.send,
                onChanged: (_) => onChanged(),
                onSubmitted: (_) => onSend(),
                style: AppText.textMdMedium.copyWith(
                  fontWeight: FontWeight.w400,
                  fontVariations: const [FontVariation('wght', 400)],
                ),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: enabled ? 'Ask the assistant…' : 'Offline',
                  hintStyle: AppText.textMdMedium.copyWith(
                    fontWeight: FontWeight.w400,
                    fontVariations: const [FontVariation('wght', 400)],
                    color: AppColors.inkFaint,
                  ),
                  filled: true,
                  fillColor: AppColors.background,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: const BorderSide(color: AppColors.primary),
                  ),
                  disabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: canSend ? AppColors.primary : AppColors.border,
              ),
              child: IconButton(
                key: const Key('chat-send'),
                tooltip: 'Send',
                icon: Icon(
                  Icons.arrow_upward_rounded,
                  color: canSend ? AppColors.ink : AppColors.inkFaint,
                ),
                onPressed: canSend ? () => onSend() : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
