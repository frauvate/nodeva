import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, Image } from 'react-native';
import { NodeItem, TaskStatus } from '../types/models';
import { useTheme } from '../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { useBoardStore } from '../store/useBoardStore';

interface Props {
  node: NodeItem;
  onDelete: (id: string) => void;
  onEdit: (node: NodeItem) => void;
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
  isConnectingSource?: boolean;
}

/* ─── Tip meta ─── */
const TYPE_META: Record<string, { icon: string; label: string; accent: string; accentDark: string; shape?: 'capsule' | 'diamond' | 'parallelogram' | 'rect' | 'cloud' }> = {
  task:          { icon: 'check-circle', label: 'GÖREV',      accent: '#22c55e', accentDark: '#4ade80' },
  note:          { icon: 'file-text',    label: 'NOT',        accent: '#10b981', accentDark: '#34d399' },
  flow_start:    { icon: 'play',         label: 'Başlangıç', accent: '#3b82f6', accentDark: '#60a5fa', shape: 'capsule' },
  flow_end:      { icon: 'square',       label: 'Bitiş',     accent: '#8b5cf6', accentDark: '#a78bfa', shape: 'capsule' },
  flow_process:  { icon: 'activity',     label: 'İşlem',     accent: '#f59e0b', accentDark: '#fbbf24', shape: 'rect' },
  flow_decision: { icon: 'help-circle',  label: 'Karar',     accent: '#ef4444', accentDark: '#f87171', shape: 'diamond' },
  flow_data:     { icon: 'database',     label: 'Veri',      accent: '#06b6d4', accentDark: '#22d3ee', shape: 'parallelogram' },
  mindmap_root:  { icon: 'target',       label: 'MERKEZ',     accent: '#ec4899', accentDark: '#f472b6', shape: 'cloud' },
  mindmap_main:  { icon: 'git-branch',   label: 'ANA BAŞLIK', accent: '#3b82f6', accentDark: '#60a5fa', shape: 'cloud' },
  mindmap_sub:   { icon: 'corner-down-right', label: 'ALT BAŞLIK', accent: '#06b6d4', accentDark: '#22d3ee', shape: 'cloud' },
};

const fallbackMeta = (type: string) => ({
  icon: 'map-pin', label: type || 'Düğüm', accent: '#6b7280', accentDark: '#9ca3af',
});

export function getNodeSize(type: string) {
  if (type === 'mindmap_root') return { w: 200, h: 80 };
  if (type === 'mindmap_main') return { w: 180, h: 70 };
  if (type === 'mindmap_sub') return { w: 150, h: 50 };
  if (type === 'flow_decision') return { w: 140, h: 140 };
  if (type === 'flow_data') return { w: 160, h: 120 };
  return { w: 200, h: 160 }; // Default size
}

/* ─── Durum meta ─── */
const STATUS_META: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  todo:        { label: 'BAŞLAMADI',    color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)' },
  in_progress: { label: 'DEVAM EDİYOR', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
  done:        { label: 'BİTTİ',        color: '#10b981', bgColor: 'rgba(16,185,129,0.12)' },
};

/* ─── Shape Indicator ─── */
const ShapeIndicator: React.FC<{ shape?: string; color: string }> = ({ shape, color }) => {
  if (!shape) return null;

  if (shape === 'capsule') {
    return (
      <View style={[styles.shapePill, { borderColor: color, backgroundColor: `${color}15` }]}>
        <View style={[styles.shapePillInner, { backgroundColor: color }]} />
      </View>
    );
  }
  if (shape === 'diamond') {
    return (
      <View style={[styles.shapeDiamondWrap]}>
        <View style={[styles.shapeDiamond, { borderColor: color, backgroundColor: `${color}20` }]} />
      </View>
    );
  }
  if (shape === 'parallelogram') {
    return (
      <View style={[styles.shapeParallelogram, { borderColor: color, backgroundColor: `${color}15`, transform: [{ skewX: '-12deg' }] }]} />
    );
  }
  // rect (process)
  return (
    <View style={[styles.shapeRect, { borderColor: color, backgroundColor: `${color}15` }]} />
  );
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/[ .@_]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const resolveColor = (color: string, isDark: boolean) => {
  if (!color) return undefined;
  if (color.startsWith('var(--node-')) {
    const name = color.substring(11, color.length - 1); // e.g. "blue"
    const map: Record<string, { light: string, dark: string }> = {
      blue:   { light: '#6366f1', dark: '#818cf8' },
      green:  { light: '#10b981', dark: '#34d399' },
      yellow: { light: '#f59e0b', dark: '#fbbf24' },
      pink:   { light: '#ec4899', dark: '#f472b6' },
      purple: { light: '#8b5cf6', dark: '#a78bfa' },
      orange: { light: '#fb923c', dark: '#ff9f43' },
    };
    const resolved = map[name];
    if (resolved) return isDark ? resolved.dark : resolved.light;
  }
  return color;
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 65%, 50%)`;
  return color;
};

const NodeComponent: React.FC<Props> = ({ node, onDelete, onEdit, onPress, style, compact, isConnectingSource }) => {
  const { colors, isDark } = useTheme();

  const meta        = TYPE_META[node.type] ?? fallbackMeta(node.type);
  const accentColor = isDark ? meta.accentDark : meta.accent;
  const isTask      = node.type === 'task';
  const isFlow      = node.type.startsWith('flow_');
  const isMindmap   = node.type.startsWith('mindmap_');
  const statusMeta  = isTask && node.data.status ? STATUS_META[node.data.status as TaskStatus] : null;

  // Reverted to transparent card background with colored border
  const cardBg = colors.surfaceStrong;
  const customColor = resolveColor(node.data.color, isDark) || accentColor;
  
  const borderStyle = isFlow
    ? { borderTopColor: customColor, borderTopWidth: 3, borderLeftWidth: 1, borderLeftColor: colors.border }
    : isMindmap
    ? { borderColor: customColor, borderWidth: 2 }
    : { borderLeftColor: customColor, borderLeftWidth: 4 };

  const isDone = isTask && node.data.status === 'done';

  const isCapsule = meta.shape === 'capsule';
  const isDiamond = meta.shape === 'diamond';
  const isParallelogram = meta.shape === 'parallelogram';

  const { w, h } = getNodeSize(node.type);

  const cardStyle: ViewStyle = {
    backgroundColor: cardBg,
    borderColor: colors.border,
    ...borderStyle,
    width: compact ? w : undefined,
    height: compact ? h : undefined,
  };

  if (compact) {
    if (isCapsule) {
      cardStyle.borderRadius = 80;
      cardStyle.justifyContent = 'center';
      cardStyle.alignItems = 'center';
      cardStyle.paddingHorizontal = 24;
    } else if (node.type === 'mindmap_root') {
      cardStyle.borderRadius = 40;
      cardStyle.borderStyle = 'dashed';
      cardStyle.justifyContent = 'center';
      cardStyle.alignItems = 'center';
      cardStyle.paddingHorizontal = 16;
      cardStyle.backgroundColor = customColor;
      cardStyle.borderWidth = 0;
    } else if (node.type === 'mindmap_main') {
      cardStyle.borderRadius = 24;
      cardStyle.justifyContent = 'center';
      cardStyle.alignItems = 'center';
      cardStyle.paddingHorizontal = 12;
      cardStyle.backgroundColor = customColor;
      cardStyle.borderWidth = 0;
    } else if (node.type === 'mindmap_sub') {
      cardStyle.backgroundColor = 'transparent';
      cardStyle.borderWidth = 0;
      cardStyle.borderBottomWidth = 2;
      cardStyle.borderBottomColor = customColor;
      cardStyle.borderRadius = 0;
      cardStyle.justifyContent = 'center';
      cardStyle.alignItems = 'center';
      cardStyle.paddingHorizontal = 8;
      cardStyle.paddingVertical = 4;
    }
  }

  const content = (
      <View
        style={[
          styles.card,
          compact && styles.cardCompact,
          isConnectingSource && { borderColor: colors.accent, borderWidth: 2, shadowColor: colors.accent, shadowOpacity: 0.5 },
          isDiamond && compact && styles.diamondCard,
          isParallelogram && compact && styles.parallelogramCard,
          cardStyle,
          style,
        ]}
      >
        <View style={isDiamond && compact ? styles.diamondInner : (isParallelogram && compact ? styles.parallelogramInner : ((isCapsule || isMindmap) && compact ? styles.capsuleInner : null))}>

        {/* ── Header ── */}
        <View style={[styles.header, compact && styles.headerCompact, (isCapsule || isDiamond || isParallelogram || isMindmap) && compact && { marginBottom: 4, width: '100%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, paddingRight: (isCapsule || isDiamond || isParallelogram || isMindmap) ? 24 : 0 }}>
            {!isFlow && !isMindmap && (
              <View style={[styles.typeBadge, { backgroundColor: isDark ? `${accentColor}15` : '#e6f4ea' }]}>
                <Text style={[styles.typeLabel, { color: accentColor }]} numberOfLines={1}>{meta.label}</Text>
              </View>
            )}
            {isFlow && (
              <View style={[styles.typeBadge, { backgroundColor: `${accentColor}22` }]}>
                <Feather name={meta.icon as any} size={10} color={accentColor} />
                <Text style={[styles.typeLabel, { color: accentColor }]} numberOfLines={1}>{meta.label}</Text>
              </View>
            )}
            
            {/* Shape indicator for flow */}
            {isFlow && !compact && <ShapeIndicator shape={meta.shape} color={accentColor} />}

            {/* Durum badge */}
            {statusMeta && (
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.bgColor }]}>
                <Text style={[styles.statusLabel, { color: statusMeta.color }]} numberOfLines={1}>{statusMeta.label}</Text>
              </View>
            )}
          </View>

          <View style={[styles.headerRight, compact && (isCapsule || isDiamond || isParallelogram || isMindmap) && { position: 'absolute', top: 0, right: 0 }]}>
            <TouchableOpacity
              onPress={() => onDelete(node.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.deleteBtn}
            >
              <Feather name="x" size={14} color={(compact && (node.type === 'mindmap_root' || node.type === 'mindmap_main')) ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Başlık ── */}
        <Text 
          style={[
            styles.title, 
            compact && styles.titleCompact, 
            { color: (compact && (node.type === 'mindmap_root' || node.type === 'mindmap_main')) ? '#FFFFFF' : (isDone ? colors.textSecondary : colors.textPrimary) },
            isDone && { textDecorationLine: 'line-through' },
            compact && (isCapsule || isDiamond || isMindmap) && { textAlign: 'center', width: '100%' }
          ]} 
          numberOfLines={compact ? 2 : 2}
        >
          {node.data.title || 'Başlıksız'}
        </Text>

        {/* ── İçerik ── */}
        {!!node.data.content && !compact && (
          <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={2}>
            {node.data.content}
          </Text>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          {!!node.data.assignee && (() => {
            const avatarUrl = useBoardStore.getState().getMemberAvatar(node.data.assignee);
            return (
              <View style={[styles.assigneeContainer, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
                maxWidth: compact ? '80%' : '100%'
              }]}>
                <View style={[styles.avatar, { backgroundColor: avatarUrl ? 'transparent' : stringToColor(node.data.assignee) }]}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{getInitials(node.data.assignee)}</Text>
                  )}
                </View>
                <Text style={[styles.assigneeText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                  {node.data.assignee}
                </Text>
              </View>
            );
          })()}
          {/* Uzun bas ipucu */}
          {!compact && (
            <Text style={[styles.editHint, { color: colors.textMuted }]}>Düzenlemek için basılı tut</Text>
          )}
        </View>
        </View>
      </View>
  );

  if (compact) {
    return content;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={() => onEdit(node)}
      delayLongPress={350}
    >
      {content}
    </TouchableOpacity>
  );
};


const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardCompact: {
    width: 200,
    height: 160, // Exact height to match web and ensure precise handle positions
    padding: 10,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerCompact: {
    marginBottom: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
    flexShrink: 1,
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
    flexShrink: 1,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
    lineHeight: 22,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 2,
  },
  content: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: '600',
    paddingRight: 4,
    flexShrink: 1,
  },
  editHint: {
    fontSize: 11,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },

  /* ── Shape Indicators ── */
  shapePill: {
    height: 16,
    width: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapePillInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shapeDiamondWrap: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapeDiamond: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  shapeParallelogram: {
    height: 16,
    width: 30,
    borderWidth: 1.5,
    borderRadius: 2,
  },
  shapeRect: {
    height: 14,
    width: 28,
    borderWidth: 1.5,
    borderRadius: 3,
  },

  /* ── Canvas Full Shapes ── */
  diamondCard: {
    transform: [{ rotate: '45deg' }],
    width: 160, // Square base for diamond
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    overflow: 'hidden',
  },
  diamondInner: {
    transform: [{ rotate: '-45deg' }],
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  parallelogramCard: {
    transform: [{ skewX: '-12deg' }],
  },
  parallelogramInner: {
    transform: [{ skewX: '12deg' }],
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 22, // Added padding to prevent text overflow in skewed corners
  },
  capsuleInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NodeComponent;

