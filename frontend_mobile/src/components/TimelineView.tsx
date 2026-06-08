import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { NodeItem } from '../types/models';
import { useTheme } from '../context/ThemeContext';
import { Feather } from '@expo/vector-icons';

const SCREEN_W = Dimensions.get('window').width;
const LEFT_PANEL_W = 130;
const HEADER_H = 36;
const DAY_H = 32;
const ROW_H = 56;

/* ─── Helpers ─── */
const parseDate = (str?: string): Date | null => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const diffDays = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86400000);

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const TR_MONTHS = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık',
];

/* ─── Draggable Bar ─── */
interface BarProps {
  node: NodeItem;
  windowStart: Date;
  totalDays: number;
  colW: number;
  rowH: number;
  accent: string;
  isDark: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: (node: NodeItem) => void;
  onMoveEnd: (nodeId: string, newStart: string, newEnd: string) => void;
  onResizeEnd: (nodeId: string, newStart: string, newEnd: string) => void;
}

const GanttBar: React.FC<BarProps> = ({
  node, windowStart, totalDays, colW, rowH,
  accent, isDark, isSelected, onSelect, onEdit, onMoveEnd, onResizeEnd,
}) => {
  const start = parseDate(node.data.startDate);
  const end   = parseDate(node.data.endDate);
  if (!start || !end) return null;

  const offsetDays = diffDays(windowStart, start);
  const durationDays = Math.max(1, diffDays(start, end) + 1);

  if (offsetDays + durationDays < 0 || offsetDays > totalDays) return null;

  const left = offsetDays * colW;
  const width = durationDays * colW;
  const progress = node.data.progress ?? 0;

  const dragX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const dragStartX = useSharedValue(0);
  const dragEndX = useSharedValue(0);
  const isResizingLeft = useSharedValue(false);
  const isResizingRight = useSharedValue(false);

  const handleMoveEnd = useCallback((dx: number) => {
    const deltaDays = Math.round(dx / colW);
    if (deltaDays === 0) return;
    const newStart = toDateStr(addDays(start, deltaDays));
    const newEnd   = toDateStr(addDays(end,   deltaDays));
    onMoveEnd(node.id, newStart, newEnd);
  }, [start, end, colW, node.id]);

  const handleResizeLeftEnd = useCallback((dx: number) => {
    const deltaDays = Math.round(dx / colW);
    if (deltaDays === 0) return;
    const newStart = toDateStr(addDays(start, deltaDays));
    if (diffDays(new Date(newStart), end) < 0) return;
    onResizeEnd(node.id, newStart, toDateStr(end));
  }, [start, end, colW, node.id]);

  const handleResizeRightEnd = useCallback((dx: number) => {
    const deltaDays = Math.round(dx / colW);
    if (deltaDays === 0) return;
    const newEnd = toDateStr(addDays(end, deltaDays));
    if (diffDays(start, new Date(newEnd)) < 0) return;
    onResizeEnd(node.id, toDateStr(start), newEnd);
  }, [start, end, colW, node.id]);

  /* Body pan gesture (move) */
  const bodyGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onBegin(() => { isDragging.value = true; dragX.value = 0; })
    .onUpdate(e => { dragX.value = e.translationX; })
    .onEnd(e => {
      isDragging.value = false;
      runOnJS(handleMoveEnd)(e.translationX);
      dragX.value = 0;
    });

  /* Left resize */
  const leftGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .onBegin(() => { isResizingLeft.value = true; dragStartX.value = 0; })
    .onUpdate(e => { dragStartX.value = e.translationX; })
    .onEnd(e => {
      isResizingLeft.value = false;
      runOnJS(handleResizeLeftEnd)(e.translationX);
      dragStartX.value = 0;
    });

  /* Right resize */
  const rightGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .onBegin(() => { isResizingRight.value = true; dragEndX.value = 0; })
    .onUpdate(e => { dragEndX.value = e.translationX; })
    .onEnd(e => {
      isResizingRight.value = false;
      runOnJS(handleResizeRightEnd)(e.translationX);
      dragEndX.value = 0;
    });

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value + dragStartX.value }],
    opacity: isDragging.value ? 0.75 : 1,
  }));

  const barColor = accent;

  return (
    <Animated.View
      style={[
        styles.barOuter,
        {
          left,
          width: width + dragEndX.value - dragStartX.value,
          top: (rowH - 28) / 2,
        },
        barStyle,
      ]}
    >
      {/* Left resize handle */}
      <GestureDetector gesture={leftGesture}>
        <View style={[styles.resizeHandle, styles.resizeHandleLeft, { backgroundColor: barColor }]} />
      </GestureDetector>

      {/* Main body */}
      <GestureDetector gesture={bodyGesture}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onSelect}
          onLongPress={() => onEdit(node)}
          delayLongPress={400}
          style={[
            styles.bar,
            {
              backgroundColor: `${barColor}30`,
              borderColor: isSelected ? barColor : `${barColor}70`,
              borderWidth: isSelected ? 2 : 1.5,
            },
          ]}
        >
          {/* Progress fill */}
          <View
            style={[
              styles.barProgress,
              { width: `${progress}%`, backgroundColor: `${barColor}60` },
            ]}
          />
          <Text style={[styles.barLabel, { color: isDark ? '#fff' : '#111' }]} numberOfLines={1}>
            {node.data.title}
          </Text>
        </TouchableOpacity>
      </GestureDetector>

      {/* Right resize handle */}
      <GestureDetector gesture={rightGesture}>
        <View style={[styles.resizeHandle, styles.resizeHandleRight, { backgroundColor: barColor }]} />
      </GestureDetector>
    </Animated.View>
  );
};

/* ─── TimelineView ─── */
interface Props {
  nodes: NodeItem[];
  onNodeEdit: (node: NodeItem) => void;
  onAddNode: () => void;
  onAiGenerate: () => void;
  onUpdateNode: (id: string, data: Partial<NodeItem['data']>) => void;
}

const TimelineView: React.FC<Props> = ({ nodes, onNodeEdit, onAddNode, onAiGenerate, onUpdateNode }) => {
  const { colors, isDark } = useTheme();
  const today = new Date();

  const [baseMonth, setBaseMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const colW = 28; // Fixed column width per day
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  /* Two-month window */
  const month1 = baseMonth;
  const month2 = baseMonth.month === 11
    ? { year: baseMonth.year + 1, month: 0 }
    : { year: baseMonth.year, month: baseMonth.month + 1 };

  const days1 = daysInMonth(month1.year, month1.month);
  const days2 = daysInMonth(month2.year, month2.month);
  const totalDays = days1 + days2;

  const windowStart = new Date(month1.year, month1.month, 1);
  const windowEnd   = new Date(month2.year, month2.month, days2);

  /* Filter visible nodes */
  const visibleNodes = nodes.filter(n => {
    const s = parseDate(n.data.startDate);
    const e = parseDate(n.data.endDate);
    if (!s || !e) return false;
    return s <= windowEnd && e >= windowStart;
  });

  /* Today line position */
  const todayOffset = diffDays(windowStart, today);
  const showToday = todayOffset >= 0 && todayOffset < totalDays;
  const todayX = todayOffset * colW + colW / 2;

  /* Month navigation */
  const prevMonth = () => {
    setBaseMonth(prev => {
      const newMonth = prev.month === 0 ? 11 : prev.month - 1;
      const newYear  = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year: newYear, month: newMonth };
    });
    setSelectedId(null);
  };

  const nextMonth = () => {
    setBaseMonth(prev => {
      const newMonth = prev.month === 11 ? 0 : prev.month + 1;
      const newYear  = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year: newYear, month: newMonth };
    });
    setSelectedId(null);
  };

  const handleMoveEnd = (nodeId: string, newStart: string, newEnd: string) => {
    onUpdateNode(nodeId, { startDate: newStart, endDate: newEnd });
  };

  const handleResizeEnd = (nodeId: string, newStart: string, newEnd: string) => {
    onUpdateNode(nodeId, { startDate: newStart, endDate: newEnd });
  };

  const totalGridW = totalDays * colW;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header Controls ── */}
      <View style={[styles.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={20} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.monthLabels}>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {TR_MONTHS[month1.month]} {month1.year}
            </Text>
            <Text style={[styles.monthSep, { color: colors.textSecondary }]}>›</Text>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {TR_MONTHS[month2.month]} {month2.year}
            </Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-right" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main body ── */}
      <View style={styles.body}>

        {/* Left task panel */}
        <View style={[styles.leftPanel, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
          {/* Header spacer */}
          <View style={[styles.leftHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.leftHeaderText, { color: colors.textSecondary }]}>GÖREVLER</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={onAiGenerate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="zap" size={15} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onAddNode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="plus" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView scrollEnabled={false} showsVerticalScrollIndicator={false}>
            {visibleNodes.length === 0 ? (
              <View style={styles.emptyLeft}>
                <Feather name="calendar" size={28} color={colors.textMuted} />
                <Text style={[styles.emptyLeftText, { color: colors.textMuted }]}>Bu ayda{'\n'}görev yok</Text>
              </View>
            ) : (
              visibleNodes.map(node => (
                <TouchableOpacity
                  key={node.id}
                  style={[
                    styles.taskRow,
                    { borderBottomColor: colors.border },
                    selectedId === node.id && { backgroundColor: `${colors.accent}12` },
                  ]}
                  onPress={() => setSelectedId(prev => prev === node.id ? null : node.id)}
                  onLongPress={() => onNodeEdit(node)}
                >
                  <View style={[styles.taskDot, { backgroundColor: colors.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.taskTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {node.data.title}
                    </Text>
                    {node.data.progress !== undefined && (
                      <View style={styles.progressRow}>
                        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.progressFg,
                              { width: `${node.data.progress}%`, backgroundColor: colors.accent },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressPct, { color: colors.textSecondary }]}>
                          {node.data.progress}%
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Right Gantt grid */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.ganttScroll}
          contentContainerStyle={{ width: totalGridW }}
        >
          <View style={{ width: totalGridW }}>

            {/* Month headers */}
            <View style={[styles.monthHeader, { borderBottomColor: colors.border }]}>
              {/* Month 1 */}
              <View style={[styles.monthHeaderCell, { width: days1 * colW, borderRightColor: colors.border }]}>
                <Text style={[styles.monthHeaderText, { color: colors.accent }]}>
                  {TR_MONTHS[month1.month]} {month1.year}
                </Text>
              </View>
              {/* Month 2 */}
              <View style={[styles.monthHeaderCell, { width: days2 * colW }]}>
                <Text style={[styles.monthHeaderText, { color: colors.accent }]}>
                  {TR_MONTHS[month2.month]} {month2.year}
                </Text>
              </View>
            </View>

            {/* Day numbers */}
            <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
              {Array.from({ length: totalDays }, (_, i) => {
                const isM2 = i >= days1;
                const dayNum = isM2 ? i - days1 + 1 : i + 1;
                const date = addDays(windowStart, i);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isTodayCol = showToday && i === todayOffset;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dayCell,
                      { width: colW, backgroundColor: isWeekend ? `${colors.accent}08` : 'transparent' },
                      isTodayCol && { backgroundColor: '#ef444420' },
                    ]}
                  >
                    {colW >= 22 && (
                      <Text
                        style={[
                          styles.dayNum,
                          { color: isTodayCol ? '#ef4444' : isWeekend ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Gantt rows */}
            <View style={{ position: 'relative' }}>
              {/* Today vertical line */}
              {showToday && (
                <View
                  style={[
                    styles.todayLine,
                    {
                      left: todayX,
                      height: Math.max(visibleNodes.length, 1) * ROW_H + 20,
                    },
                  ]}
                />
              )}

              {visibleNodes.length === 0 ? (
                <View style={[styles.emptyGantt, { height: ROW_H * 3 }]}>
                  <Feather name="calendar" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyGanttText, { color: colors.textMuted }]}>
                    Bu ay için görev yok
                  </Text>
                </View>
              ) : (
                visibleNodes.map((node, idx) => (
                  <View
                    key={node.id}
                    style={[
                      styles.ganttRow,
                      {
                        height: ROW_H,
                        backgroundColor: idx % 2 === 0
                          ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')
                          : 'transparent',
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    {/* Column dividers */}
                    {Array.from({ length: totalDays }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.colDivider,
                          {
                            left: i * colW,
                            borderRightColor: i === days1 - 1
                              ? colors.accent + '60'
                              : colors.border,
                            borderRightWidth: i === days1 - 1 ? 2 : 1,
                          },
                        ]}
                      />
                    ))}

                    {/* Gantt bar */}
                    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
                      <GanttBar
                        node={node}
                        windowStart={windowStart}
                        totalDays={totalDays}
                        colW={colW}
                        rowH={ROW_H}
                        accent={colors.accent}
                        isDark={isDark}
                        isSelected={selectedId === node.id}
                        onSelect={() => setSelectedId(prev => prev === node.id ? null : node.id)}
                        onEdit={onNodeEdit}
                        onMoveEnd={handleMoveEnd}
                        onResizeEnd={handleResizeEnd}
                      />
                    </GestureHandlerRootView>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1 },

  controls: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 4 },
  monthLabels: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthLabel: { fontSize: 13, fontWeight: '700' },
  monthSep: { fontSize: 14 },

  body: { flex: 1, flexDirection: 'row' },

  leftPanel: {
    width: LEFT_PANEL_W,
    borderRightWidth: 1,
  },
  leftHeader: {
    height: HEADER_H + DAY_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  leftHeaderText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  emptyLeft: { alignItems: 'center', padding: 20, gap: 8 },
  emptyLeftText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  taskRow: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  taskDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  taskTitle: { fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  progressBg: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFg: { height: 3, borderRadius: 2 },
  progressPct: { fontSize: 9, fontWeight: '700', width: 24 },

  ganttScroll: { flex: 1 },

  monthHeader: {
    flexDirection: 'row',
    height: HEADER_H,
    borderBottomWidth: 1,
  },
  monthHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  monthHeaderText: { fontSize: 11, fontWeight: '800' },

  dayHeader: {
    flexDirection: 'row',
    height: DAY_H,
    borderBottomWidth: 1,
  },
  dayCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'transparent',
  },
  dayNum: { fontSize: 9, fontWeight: '600' },

  ganttRow: {
    borderBottomWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  colDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },

  todayLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: '#ef4444',
    opacity: 0.6,
    zIndex: 10,
    borderStyle: 'dashed',
  },

  emptyGantt: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyGanttText: { fontSize: 13 },

  barOuter: {
    position: 'absolute',
    height: 28,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  bar: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  barProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  barLabel: { fontSize: 10, fontWeight: '700', zIndex: 1 },
  resizeHandle: {
    width: 10,
    borderRadius: 3,
    opacity: 0.8,
  },
  resizeHandleLeft:  { marginRight: 2, borderTopLeftRadius: 6,  borderBottomLeftRadius:  6 },
  resizeHandleRight: { marginLeft:  2, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
});

export default TimelineView;
