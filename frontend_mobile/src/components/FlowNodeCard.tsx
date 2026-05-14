import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { NodeItem } from '../types/models';
import { useTheme } from '../context/ThemeContext';

interface Props {
  node: NodeItem;
  onDelete: (id: string) => void;
  onEdit: (node: NodeItem) => void;
  style?: ViewStyle;
}

const FLOW_META: Record<string, { label: string; accent: string; accentDark: string }> = {
  flow_start:    { label: 'Başlangıç', accent: '#3b82f6', accentDark: '#60a5fa' },
  flow_end:      { label: 'Bitiş',     accent: '#8b5cf6', accentDark: '#a78bfa' },
  flow_process:  { label: 'İşlem',     accent: '#f59e0b', accentDark: '#fbbf24' },
  flow_decision: { label: 'Karar',     accent: '#ef4444', accentDark: '#f87171' },
  flow_data:     { label: 'Veri',      accent: '#06b6d4', accentDark: '#22d3ee' },
};

/* ──────────────────────────────────────────────────────────── */
/* Oval – flow_start / flow_end                               */
/* ──────────────────────────────────────────────────────────── */
const OvalCard: React.FC<{ node: NodeItem; accent: string; label: string; onDelete: () => void; onEdit: () => void }> = ({
  node, accent, label, onDelete, onEdit,
}) => {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.85} onLongPress={onEdit} delayLongPress={350}>
      <View style={[styles.ovalCard, { borderColor: accent, backgroundColor: `${accent}18` }]}>
        <View style={styles.shapeHeader}>
          <View style={[styles.badge, { backgroundColor: `${accent}28` }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{label}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
            <Text style={[styles.deleteBtnText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.shapeTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {node.data.title || 'Başlıksız'}
        </Text>
        {!!node.data.content && (
          <Text style={[styles.shapeContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {node.data.content}
          </Text>
        )}
        <Text style={[styles.editHint, { color: colors.textMuted }]}>Düzenlemek için basılı tut</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* Diamond – flow_decision                                     */
/* ──────────────────────────────────────────────────────────── */
const DiamondCard: React.FC<{ node: NodeItem; accent: string; label: string; onDelete: () => void; onEdit: () => void }> = ({
  node, accent, label, onDelete, onEdit,
}) => {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.85} onLongPress={onEdit} delayLongPress={350}>
      <View style={[styles.diamondWrapper]}>
        {/* Diamond background */}
        <View style={[styles.diamondBg, { borderColor: accent, backgroundColor: `${accent}15` }]} />
        {/* Content on top – must be counter-rotated */}
        <View style={styles.diamondContent}>
          <View style={styles.shapeHeader}>
            <View style={[styles.badge, { backgroundColor: `${accent}28` }]}>
              <Text style={[styles.badgeText, { color: accent }]}>{label}</Text>
            </View>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
              <Text style={[styles.deleteBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.shapeTitle, { color: colors.textPrimary, textAlign: 'center' }]} numberOfLines={3}>
            {node.data.title || 'Başlıksız'}
          </Text>
          <Text style={[styles.editHint, { color: colors.textMuted, textAlign: 'center' }]}>Basılı tut</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* Parallelogram – flow_data                                  */
/* ──────────────────────────────────────────────────────────── */
const ParallelogramCard: React.FC<{ node: NodeItem; accent: string; label: string; onDelete: () => void; onEdit: () => void }> = ({
  node, accent, label, onDelete, onEdit,
}) => {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.85} onLongPress={onEdit} delayLongPress={350}>
      {/* Outer skewed container */}
      <View style={[styles.parallelogramBg, { borderColor: accent, backgroundColor: `${accent}15` }]}>
        {/* Counter-skew so text is upright */}
        <View style={styles.parallelogramContent}>
          <View style={styles.shapeHeader}>
            <View style={[styles.badge, { backgroundColor: `${accent}28` }]}>
              <Text style={[styles.badgeText, { color: accent }]}>{label}</Text>
            </View>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
              <Text style={[styles.deleteBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.shapeTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {node.data.title || 'Başlıksız'}
          </Text>
          {!!node.data.content && (
            <Text style={[styles.shapeContent, { color: colors.textSecondary }]} numberOfLines={2}>
              {node.data.content}
            </Text>
          )}
          <Text style={[styles.editHint, { color: colors.textMuted }]}>Düzenlemek için basılı tut</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* Rectangle – flow_process (standard)                        */
/* ──────────────────────────────────────────────────────────── */
const RectCard: React.FC<{ node: NodeItem; accent: string; label: string; onDelete: () => void; onEdit: () => void }> = ({
  node, accent, label, onDelete, onEdit,
}) => {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.85} onLongPress={onEdit} delayLongPress={350}>
      <View style={[styles.rectCard, {
        borderColor: colors.border,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
        borderTopColor: accent,
        borderTopWidth: 3,
      }]}>
        <View style={styles.shapeHeader}>
          <View style={[styles.badge, { backgroundColor: `${accent}22` }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{label}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
            <Text style={[styles.deleteBtnText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.shapeTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {node.data.title || 'Başlıksız'}
        </Text>
        {!!node.data.content && (
          <Text style={[styles.shapeContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {node.data.content}
          </Text>
        )}
        <Text style={[styles.editHint, { color: colors.textMuted }]}>Düzenlemek için basılı tut</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* Main export                                                 */
/* ──────────────────────────────────────────────────────────── */
const FlowNodeCard: React.FC<Props> = ({ node, onDelete, onEdit, style }) => {
  const meta = FLOW_META[node.type];
  if (!meta) return null;

  const { isDark } = useTheme();
  const accent = isDark ? `${meta.accent}` : meta.accent;
  const props = { node, accent, label: meta.label, onDelete: () => onDelete(node.id), onEdit: () => onEdit(node) };

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {node.type === 'flow_start' || node.type === 'flow_end'
        ? <OvalCard {...props} />
        : node.type === 'flow_decision'
        ? <DiamondCard {...props} />
        : node.type === 'flow_data'
        ? <ParallelogramCard {...props} />
        : <RectCard {...props} />
      }
    </View>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* Styles                                                      */
/* ──────────────────────────────────────────────────────────── */
const SKEW = '-14deg';
const COUNTER_SKEW = '14deg';

const styles = StyleSheet.create({
  shapeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shapeTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
    lineHeight: 22,
  },
  shapeContent: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  editHint: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },

  /* Oval */
  ovalCard: {
    borderRadius: 100,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  /* Diamond */
  diamondWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    marginVertical: 8,
  },
  diamondBg: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderWidth: 2,
    borderRadius: 10,
    transform: [{ rotate: '45deg' }],
  },
  diamondContent: {
    position: 'absolute',
    width: 150,
    padding: 12,
    alignItems: 'center',
  },

  /* Parallelogram */
  parallelogramBg: {
    borderWidth: 2,
    borderRadius: 4,
    transform: [{ skewX: SKEW }],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  parallelogramContent: {
    transform: [{ skewX: COUNTER_SKEW }],
    paddingVertical: 14,
    paddingHorizontal: 24, // Increased padding to avoid corner overflow
  },

  /* Rectangle */
  rectCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default FlowNodeCard;
