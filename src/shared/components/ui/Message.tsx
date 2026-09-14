import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

export type MessageAlign = 'start' | 'end';
export type BubbleVariant = 'primary' | 'muted' | 'ghost';

/* ==========================================================================
   1. MessageGroup: Stacks consecutive messages from the same sender
   ========================================================================== */
export interface MessageGroupProps {
  children: React.ReactNode;
  align?: MessageAlign;
  style?: StyleProp<ViewStyle>;
}

export const MessageGroup: React.FC<MessageGroupProps> = ({
  children,
  align = 'start',
  style,
}) => {
  return (
    <View
      style={[
        styles.groupContainer,
        align === 'end' ? styles.groupEnd : styles.groupStart,
        style,
      ]}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
};

/* ==========================================================================
   2. Message: The main row component (manages align, avatar, content)
   ========================================================================== */
export interface MessageProps {
  children: React.ReactNode;
  align?: MessageAlign;
  style?: StyleProp<ViewStyle>;
}

export const Message: React.FC<MessageProps> = ({
  children,
  align = 'start',
  style,
}) => {
  const isEnd = align === 'end';

  return (
    <View
      style={[
        styles.messageRow,
        isEnd ? styles.messageRowEnd : styles.messageRowStart,
        style,
      ]}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
};

/* ==========================================================================
   3. MessageAvatar: Anchored avatar for the message row
   ========================================================================== */
export interface MessageAvatarProps {
  src?: string | null;
  fallback?: string;
  size?: number;
  status?: 'online' | 'offline' | 'busy';
  style?: StyleProp<ViewStyle>;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({
  src,
  fallback = 'U',
  size = 32,
  status,
  style,
}) => {
  const avatarBoxStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const statusColor =
    status === 'online' ? '#187657' : status === 'busy' ? '#a06707' : '#FAFBFD';

  return (
    <View style={[styles.avatarBox, avatarBoxStyle, style]}>
      {src ? (
        <Image
          source={{ uri: src }}
          style={[styles.avatarImg, avatarBoxStyle as ImageStyle]}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.avatarFallbackText, { fontSize: size * 0.38 }]}>
          {fallback.slice(0, 2).toUpperCase()}
        </Text>
      )}
      {status ? (
        <View
          style={[
            styles.avatarStatusBadge,
            {
              backgroundColor: statusColor,
              width: Math.max(8, size * 0.26),
              height: Math.max(8, size * 0.26),
              borderRadius: Math.max(4, size * 0.13),
            },
          ]}
        />
      ) : null}
    </View>
  );
};

/* ==========================================================================
   4. MessageContent: Container holding header, bubble, and footer
   ========================================================================== */
export interface MessageContentProps {
  children: React.ReactNode;
  align?: MessageAlign;
  style?: StyleProp<ViewStyle>;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  children,
  align = 'start',
  style,
}) => {
  const isEnd = align === 'end';

  return (
    <View
      style={[
        styles.contentContainer,
        isEnd ? styles.contentEnd : styles.contentStart,
        style,
      ]}
    >
      {children}
    </View>
  );
};

/* ==========================================================================
   5. MessageHeader: Sender name and optional time label
   ========================================================================== */
export interface MessageHeaderProps {
  name?: string;
  time?: string;
  align?: MessageAlign;
  style?: StyleProp<ViewStyle>;
}

export const MessageHeader: React.FC<MessageHeaderProps> = ({
  name,
  time,
  align = 'start',
  style,
}) => {
  const isEnd = align === 'end';

  if (!name && !time) return null;

  return (
    <View
      style={[
        styles.headerRow,
        isEnd ? styles.headerRowEnd : styles.headerRowStart,
        style,
      ]}
    >
      {name ? <Text style={styles.headerName}>{name}</Text> : null}
      {time ? <Text style={styles.headerTime}>{time}</Text> : null}
    </View>
  );
};

/* ==========================================================================
   6. Bubble: The visual message surface
   ========================================================================== */
export interface BubbleProps {
  children: React.ReactNode;
  variant?: BubbleVariant;
  align?: MessageAlign;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Bubble: React.FC<BubbleProps> = ({
  children,
  variant,
  align = 'start',
  onPress,
  onLongPress,
  style,
}) => {
  const isEnd = align === 'end';
  const finalVariant: BubbleVariant = variant || (isEnd ? 'primary' : 'muted');

  const Container = onPress || onLongPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.bubbleBase,
        isEnd ? styles.bubbleEnd : styles.bubbleStart,
        finalVariant === 'primary' && styles.bubblePrimary,
        finalVariant === 'muted' && styles.bubbleMuted,
        finalVariant === 'ghost' && styles.bubbleGhost,
        style,
      ]}
    >
      {finalVariant === 'primary' ? (
        <LinearGradient
          colors={['#E1EDFA', '#452fa0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </Container>
  );
};

/* ==========================================================================
   7. BubbleContent: The textual message body inside Bubble
   ========================================================================== */
export interface BubbleContentProps {
  children: React.ReactNode;
  variant?: BubbleVariant;
  style?: StyleProp<TextStyle>;
}

export const BubbleContent: React.FC<BubbleContentProps> = ({
  children,
  variant = 'muted',
  style,
}) => {
  const isPrimary = variant === 'primary';

  return (
    <Text
      style={[
        styles.bubbleText,
        isPrimary ? styles.bubbleTextPrimary : styles.bubbleTextMuted,
        style,
      ]}
      selectable
    >
      {children}
    </Text>
  );
};

/* ==========================================================================
   8. MessageFooter: Delivery status, read indicators, and reactions
   ========================================================================== */
export interface MessageFooterProps {
  time?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reaction?: string;
  onReactionPress?: () => void;
  align?: MessageAlign;
  style?: StyleProp<ViewStyle>;
}

export const MessageFooter: React.FC<MessageFooterProps> = ({
  time,
  status,
  reaction,
  onReactionPress,
  align = 'start',
  style,
}) => {
  const isEnd = align === 'end';

  return (
    <View
      style={[
        styles.footerRow,
        isEnd ? styles.footerRowEnd : styles.footerRowStart,
        style,
      ]}
    >
      {reaction ? (
        <TouchableOpacity
          onPress={onReactionPress}
          activeOpacity={0.7}
          style={styles.reactionBadge}
        >
          <Text style={styles.reactionText}>{reaction}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.footerMeta}>
        {time ? <Text style={styles.footerTime}>{time}</Text> : null}

        {status === 'read' ? (
          <View style={styles.statusWrap}>
            <Ionicons name="checkmark-done" size={13} color="#3269C7" />
            <Text style={[styles.statusText, { color: '#3269C7' }]}>Okundu</Text>
          </View>
        ) : status === 'delivered' ? (
          <View style={styles.statusWrap}>
            <Ionicons name="checkmark-done" size={13} color="#94a3b8" />
            <Text style={styles.statusText}>İletildi</Text>
          </View>
        ) : status === 'sent' ? (
          <View style={styles.statusWrap}>
            <Ionicons name="checkmark" size={13} color="#94a3b8" />
          </View>
        ) : status === 'failed' ? (
          <View style={styles.statusWrap}>
            <Ionicons name="alert-circle" size={13} color="#a02e2e" />
            <Text style={[styles.statusText, { color: '#a02e2e' }]}>İletilemedi</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

/* ==========================================================================
   9. TypingIndicator: Animated dots ("Oliver is typing...")
   ========================================================================== */
export interface TypingIndicatorProps {
  name?: string;
  avatarSrc?: string | null;
  style?: StyleProp<ViewStyle>;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  name = 'Oliver',
  avatarSrc,
  style,
}) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 380,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 180);
    const a3 = pulse(dot3, 360);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={[styles.typingRow, style]}>
      <MessageAvatar src={avatarSrc} fallback={name} size={28} />
      <View style={styles.typingBubble}>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
        </View>
        <Text style={styles.typingText}>{name} yazıyor...</Text>
      </View>
    </View>
  );
};

/* ==========================================================================
   Styles: Pristine shadcn dark glassmorphic styling
   ========================================================================== */
const styles = StyleSheet.create({
  groupContainer: {
    marginVertical: 4,
    gap: 4,
  },
  groupStart: {
    alignItems: 'flex-start',
  },
  groupEnd: {
    alignItems: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '86%',
    marginVertical: 2.5,
  },
  messageRowStart: {
    alignSelf: 'flex-start',
  },
  messageRowEnd: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarBox: {
    backgroundColor: 'rgba(228,218,250, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(228,218,250, 0.35)',
    overflow: 'hidden',
    marginBottom: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallbackText: {
    color: '#7c72a0',
    fontWeight: '700',
  },
  avatarStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: '#FAFBFD',
  },
  contentContainer: {
    maxWidth: '100%',
    gap: 3,
  },
  contentStart: {
    alignItems: 'flex-start',
  },
  contentEnd: {
    alignItems: 'flex-end',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  headerRowStart: {
    justifyContent: 'flex-start',
  },
  headerRowEnd: {
    justifyContent: 'flex-end',
  },
  headerName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  headerTime: {
    fontSize: 10,
    color: '#686474',
  },
  bubbleBase: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
    position: 'relative',
    maxWidth: '100%',
  },
  bubbleStart: {
    borderBottomLeftRadius: 5,
  },
  bubbleEnd: {
    borderBottomRightRadius: 5,
  },
  bubblePrimary: {
    backgroundColor: '#E1EDFA',
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  bubbleMuted: {
    backgroundColor: 'rgba(250,251,253, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.1)',
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.08)',
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  bubbleTextPrimary: {
    color: '#252333',
    fontWeight: '500',
  },
  bubbleTextMuted: {
    color: '#252333',
    fontWeight: '400',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 1,
  },
  footerRowStart: {
    justifyContent: 'flex-start',
  },
  footerRowEnd: {
    justifyContent: 'flex-end',
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerTime: {
    fontSize: 10,
    color: '#686474',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    fontSize: 9.5,
    color: '#686474',
    fontWeight: '500',
  },
  reactionBadge: {
    backgroundColor: 'rgba(250,251,253, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  reactionText: {
    fontSize: 11,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(250,251,253, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.08)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3269C7',
  },
  typingText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
