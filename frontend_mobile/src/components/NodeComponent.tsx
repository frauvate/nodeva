import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { NodeItem, TaskStatus } from '../types/models';
import { useTheme } from '../context/ThemeContext';

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
const TYPE_META: Record<string, { icon: string; label: string; accent: string; accentDark: string }> = {
  task: { icon: '✅', label: 'Görev',  accent: '#6366f1', accentDark: '#818cf8' },
  note: { icon: '📝', label: 'Not',    accent: '#10b981', accentDark: '#34d399' },
};
const fallbackMeta = (type: string) => ({
  icon: '📌', label: type || 'Düğüm', accent: '#6b7280', accentDark: '#9ca3af',
});

/* ─── Durum meta ─── */
const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: 'Başlamadı',    color: '#ef4444' },
  in_progress: { label: 'Devam Ediyor', color: '#f59e0b' },
  done:        { label: 'Bitti',         color: '#10b981' },
};

const NodeComponent: React.FC<Props> = ({ node, onDelete, onEdit, onPress, style, compact, isConnectingSource }) => {
  const { colors, isDark } = useTheme();

  const meta        = TYPE_META[node.type] ?? fallbackMeta(node.type);
  const accentColor = isDark ? meta.accentDark : meta.accent;
  const isTask      = node.type === 'task';
  const statusMeta  = isTask && node.data.status ? STATUS_META[node.data.status as TaskStatus] : null;

  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#ffffff';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={() => onEdit(node)}
      delayLongPress={350}
    >
      <View
        style={[
          styles.card,
          compact && styles.cardCompact,
          isConnectingSource && { borderColor: '#3b82f6', borderWidth: 2, shadowColor: '#3b82f6', shadowOpacity: 0.5 },
          {
            backgroundColor: cardBg,
            borderColor: colors.border,
            borderLeftColor: accentColor,
            borderLeftWidth: 4,
          },
          style,
        ]}
      >
        {/* ── Header ── */}
        <View style={[styles.header, compact && styles.headerCompact]}>
          {/* Tip badge */}
          <View style={[styles.typeBadge, { backgroundColor: `${accentColor}22` }]}>
            <Text style={styles.typeIcon}>{meta.icon}</Text>
            <Text style={[styles.typeLabel, { color: accentColor }]}>{meta.label}</Text>
          </View>

          <View style={styles.headerRight}>
            {/* Durum badge (yalnızca görevler) */}
            {statusMeta && (
              <View style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}18` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
                <Text style={[styles.statusLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            )}

            {/* Sil butonu */}
            <TouchableOpacity
              onPress={() => onDelete(node.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
            >
              <Text style={[styles.deleteBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Başlık ── */}
        <Text style={[styles.title, compact && styles.titleCompact, { color: colors.textPrimary }]} numberOfLines={compact ? 3 : 2}>
          {node.data.title || 'Başlıksız'}
        </Text>

        {/* ── İçerik ── */}
        {!!node.data.content && !compact && (
          <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={3}>
            {node.data.content}
          </Text>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          {!!node.data.color && (
            <View style={[styles.colorDot, { backgroundColor: node.data.color }]} />
          )}
          {!!node.data.assignee && (
            <View style={[styles.assigneeBadge, { backgroundColor: `${accentColor}18` }]}>
              <Text style={[styles.assigneeText, { color: accentColor }]}>@{node.data.assignee}</Text>
            </View>
          )}
          {/* Uzun bas ipucu */}
          {!compact && (
            <Text style={[styles.editHint, { color: colors.textMuted }]}>Düzenlemek için basılı tut</Text>
          )}
          {compact && (
            <View style={styles.handleIndicator} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardCompact: {
    width: 200,
    height: 130, // Exact height to match web and ensure precise handle positions
    padding: 10,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerCompact: {
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  typeIcon: {
    fontSize: 12,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 5,
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
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  assigneeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  editHint: {
    fontSize: 10,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },
  handleIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
    marginLeft: 'auto',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default NodeComponent;
