import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useBoardStore } from '../store/useBoardStore';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { NodeItem, EdgeItem, TaskStatus } from '../types/models';
import AddNodeDialog from '../components/AddNodeDialog';
import NodeComponent from '../components/NodeComponent';
import EditNodeSheet from '../components/EditNodeSheet';
import MobileCanvas from '../components/MobileCanvas';

type Props = StackScreenProps<RootStackParamList, 'Board'>;

type TabKey = 'tasks' | 'notes';

/* ─── Görev grupları ─── */
const TASK_GROUPS: { key: TaskStatus; label: string; color: string; emptyLabel: string }[] = [
  { key: 'todo',        label: 'Başlamadı',    color: '#ef4444', emptyLabel: 'Bekleyen görev yok' },
  { key: 'in_progress', label: 'Devam Ediyor', color: '#f59e0b', emptyLabel: 'Devam eden görev yok' },
  { key: 'done',        label: 'Bitti',         color: '#10b981', emptyLabel: 'Tamamlanan görev yok' },
];

const BoardScreen: React.FC<Props> = ({ route, navigation }: Props) => {
  const { boardId } = route.params;
  const { activeBoard, selectBoard, addNode, deleteNode, updateNode, saveBoard, deleteEdge, isLoading, error } = useBoardStore();
  const { colors, isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab]           = useState<TabKey>('tasks');
  const [dialogVisible, setDialogVisible]   = useState(false);
  const [editingNode, setEditingNode]       = useState<NodeItem | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [viewMode, setViewMode]             = useState<'structured' | 'freeflow'>('structured');

  /* Navigator header'ını kapat — kendi toolbar'ımızı kullanıyoruz */
  useEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);
  useEffect(() => { selectBoard(boardId); }, [boardId, selectBoard]);

  /* ─── Store actions ─── */
  const handleAddNode = (data: { title: string; content: string; type: string; color: string }) => {
    const newNode: NodeItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: data.type,
      position: { x: 0, y: 0 },
      data: {
        title:   data.title,
        content: data.content,
        color:   data.color,
        status:  data.type === 'task' ? 'todo' : undefined,
      },
    };
    addNode(newNode);
    saveBoard();
  };

  const handleDelete = (nodeId: string) => {
    deleteNode(nodeId);
    saveBoard();
  };

  const handleOpenEdit = (node: NodeItem) => {
    setEditingNode(node);
    setEditSheetVisible(true);
  };

  const handleSaveEdit = (
    nodeId: string,
    updates: { title: string; content: string; color: string; assignee?: string; status?: TaskStatus },
  ) => {
    updateNode(nodeId, updates);
    saveBoard();
    setEditSheetVisible(false);
  };

  const handleNodeDragEnd = (nodeId: string, position: { x: number, y: number }) => {
    useBoardStore.getState().updateNodePosition(nodeId, position);
    saveBoard();
  };

  const handleConnectNodes = (sourceId: string, targetId: string) => {
    if (!activeBoard) return;
    const newEdge: EdgeItem = {
      id: Math.random().toString(36).substr(2, 9),
      source: sourceId,
      sourceHandle: 'right',
      target: targetId,
      targetHandle: 'left'
    };
    useBoardStore.getState().addEdge(newEdge);
    saveBoard();
  };

  const handleEdgeDelete = (edgeId: string) => {
    deleteEdge(edgeId);
    saveBoard();
  };

  /* ─── Derived lists ─── */
  const tasks = activeBoard?.nodes.filter((n) => n.type === 'task') ?? [];
  const notes = activeBoard?.nodes.filter((n) => n.type === 'note')  ?? [];

  /* ─── States ─── */
  if (isLoading && !activeBoard) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !activeBoard) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.centered, { padding: 24 }]}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={{ color: colors.error, fontSize: 15, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={() => selectBoard(boardId)}>
            <Text style={{ color: colors.accentText, fontWeight: '700' }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeBoard) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Pano bulunamadı.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={{ color: colors.accent }}>← Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Render ─── */
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Toolbar ── */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.toolbarBack, { color: colors.accent }]}>‹ Geri</Text>
        </TouchableOpacity>

        <View style={styles.toolbarCenter}>
          <Text style={[styles.toolbarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {activeBoard.title}
          </Text>
          <Text style={[styles.toolbarSub, { color: colors.textSecondary }]}>
            {tasks.length} görev · {notes.length} not
          </Text>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setViewMode(v => v === 'structured' ? 'freeflow' : 'structured')} style={styles.toolbarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.toolbarIcon}>{viewMode === 'structured' ? '🖼️' : '📋'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.toolbarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.toolbarIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'freeflow' ? (
        <View style={{ flex: 1 }}>
          <Text style={{ textAlign: 'center', padding: 8, fontSize: 12, color: colors.textSecondary, backgroundColor: colors.surface }}>
            İlişki (ok) kurmak için önce bir karta, sonra diğer karta dokunun.
          </Text>
          <MobileCanvas 
             nodes={activeBoard.nodes} 
             edges={activeBoard.edges || []}
             onNodeDragEnd={handleNodeDragEnd}
             onNodeDelete={handleDelete}
             onNodeEdit={handleOpenEdit}
             onConnectNodes={handleConnectNodes}
             onEdgeDelete={handleEdgeDelete}
          />
        </View>
      ) : (
        <>
          {/* ── 2 Tab Bar ── */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {([
              { key: 'tasks' as TabKey, icon: '✅', label: 'Görevler', count: tasks.length },
              { key: 'notes' as TabKey, icon: '📝', label: 'Notlar',   count: notes.length },
            ]).map(({ key, icon, label, count }) => {
              const isActive = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.tabItem, isActive && { borderBottomColor: colors.accent, borderBottomWidth: 2.5 }]}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tabIcon}>{icon}</Text>
                  <Text style={[styles.tabLabel, { color: isActive ? colors.accent : colors.textSecondary }]}>{label}</Text>
                  <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.accent : colors.border }]}>
                    <Text style={[styles.tabBadgeText, { color: isActive ? colors.accentText : colors.textSecondary }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Content ── */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ── GÖREVLER SEKMESİ ── */}
        {activeTab === 'tasks' && (
          <>
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Henüz görev yok</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  + butonuna basarak görev ekleyebilirsin.
                </Text>
              </View>
            ) : (
              TASK_GROUPS.map(({ key, label, color, emptyLabel }) => {
                const groupNodes = tasks.filter(
                  (n) => (n.data.status ?? 'todo') === key,
                );
                return (
                  <View key={key} style={styles.group}>
                    {/* Grup Başlığı */}
                    <View style={styles.groupHeader}>
                      <View style={[styles.groupDot, { backgroundColor: color }]} />
                      <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>{label}</Text>
                      <View style={[styles.groupBadge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.groupBadgeText, { color }]}>{groupNodes.length}</Text>
                      </View>
                    </View>

                    {groupNodes.length === 0 ? (
                      <Text style={[styles.groupEmpty, { color: colors.textMuted }]}>{emptyLabel}</Text>
                    ) : (
                      groupNodes.map((node) => (
                        <NodeComponent
                          key={node.id}
                          node={node}
                          onDelete={handleDelete}
                          onEdit={handleOpenEdit}
                          style={styles.nodeSpacing}
                        />
                      ))
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ── NOTLAR SEKMESİ ── */}
        {activeTab === 'notes' && (
          <>
            {notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Henüz not yok</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  + butonuna basarak not ekleyebilirsin.
                </Text>
              </View>
            ) : (
              <>
                {/* Notlar bölüm başlığı */}
                <View style={styles.group}>
                  <View style={styles.groupHeader}>
                    <View style={[styles.groupDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>Tüm Notlar</Text>
                    <View style={[styles.groupBadge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                      <Text style={[styles.groupBadgeText, { color: '#10b981' }]}>{notes.length}</Text>
                    </View>
                  </View>

                  {notes.map((node) => (
                    <NodeComponent
                      key={node.id}
                      node={node}
                      onDelete={handleDelete}
                      onEdit={handleOpenEdit}
                      style={styles.nodeSpacing}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setDialogVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabText, { color: colors.accentText }]}>+</Text>
      </TouchableOpacity>

      {/* ── Add Dialog ── */}
      <AddNodeDialog
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        onAdd={handleAddNode}
      />

      {/* ── Edit Sheet ── */}
      <EditNodeSheet
        visible={editSheetVisible}
        node={editingNode}
        boardId={boardId}
        teamId={activeBoard?.team_id ?? undefined}
        onClose={() => setEditSheetVisible(false)}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  safe:    { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorEmoji: { fontSize: 40, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  toolbarBtn:    { minWidth: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  toolbarBack:   { fontSize: 16, fontWeight: '600' },
  toolbarCenter: { flex: 1, alignItems: 'center' },
  toolbarTitle:  { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  toolbarSub:    { fontSize: 11, marginTop: 1 },
  toolbarIcon:   { fontSize: 22 },

  /* Tabs */
  tabBar:     { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 5 },
  tabIcon:    { fontSize: 14 },
  tabLabel:   { fontSize: 13, fontWeight: '600' },
  tabBadge:   { borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },

  /* Scroll */
  scrollArea:    { flex: 1 },
  scrollContent: { padding: 16 },

  /* Groups */
  group: { marginBottom: 24 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  groupDot:       { width: 10, height: 10, borderRadius: 5 },
  groupTitle:     { fontSize: 15, fontWeight: '700', flex: 1 },
  groupBadge:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  groupBadgeText: { fontSize: 12, fontWeight: '700' },
  groupEmpty:     { fontSize: 13, fontStyle: 'italic', paddingLeft: 18, paddingBottom: 4 },

  /* Nodes */
  nodeSpacing: { marginBottom: 10 },

  /* Empty */
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 36 : 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: { fontSize: 36, lineHeight: 40, textAlign: 'center', marginTop: -2 },
});

export default BoardScreen;
