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
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useBoardStore } from '../store/useBoardStore';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { NodeItem, EdgeItem, TaskStatus } from '../types/models';
import AddNodeDialog from '../components/AddNodeDialog';
import NodeComponent from '../components/NodeComponent';
import FlowNodeCard from '../components/FlowNodeCard';
import EditNodeSheet from '../components/EditNodeSheet';
import MobileCanvas from '../components/MobileCanvas';
import KanbanView from '../components/KanbanView';
import TimelineView from '../components/TimelineView';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

type Props = StackScreenProps<RootStackParamList, 'Board'>;

type TabKey = 'tasks' | 'notes' | 'flow';

const FLOW_TYPES = ['flow_start', 'flow_end', 'flow_process', 'flow_decision', 'flow_data'];

/* ─── Görev grupları ─── */
const TASK_GROUPS: { key: TaskStatus; label: string; color: string; emptyLabel: string; icon: string }[] = [
  { key: 'todo',        label: 'Başlamadı',    color: '#ef4444', emptyLabel: 'Bekleyen görev yok', icon: 'circle' },
  { key: 'in_progress', label: 'Devam Ediyor', color: '#f59e0b', emptyLabel: 'Devam eden görev yok', icon: 'clock' },
  { key: 'done',        label: 'Bitti',         color: '#10b981', emptyLabel: 'Tamamlanan görev yok', icon: 'check-circle' },
];

const BoardScreen: React.FC<Props> = ({ route, navigation }: Props) => {
  const { boardId, template: routeTemplate } = route.params;
  const { activeBoard, selectBoard, addNode, deleteNode, updateNode, saveBoard, deleteEdge, generateAI, shareBoard, isLoading, error } = useBoardStore();
  const { colors, isDark, toggleTheme } = useTheme();

  const MINDMAP_TYPES = ['mindmap_root', 'mindmap_main', 'mindmap_sub'];
  const KANBAN_TYPES  = ['task', 'note'];

  const boardTemplate: string = React.useMemo(() => {
    // 1. Explicit template from route params (freshly created boards)
    if (routeTemplate) return routeTemplate;
    // 2. Saved template field on the board
    if (activeBoard?.template) return activeBoard.template;
    // 3. Infer from node types (legacy boards without a template field)
    const nodes = activeBoard?.nodes || [];
    if (nodes.some(n => FLOW_TYPES.includes(n.type)))     return 'flowchart';
    if (nodes.some(n => MINDMAP_TYPES.includes(n.type)))  return 'mindmap';
    // Timeline: nodes with startDate or endDate
    if (nodes.some(n => n.data?.startDate || n.data?.endDate)) return 'timeline';
    return 'basic';
  }, [routeTemplate, activeBoard?.template, activeBoard?.nodes]);

  const isFlowchart = boardTemplate === 'flowchart';
  const isMindmap   = boardTemplate === 'mindmap';
  const isKanban    = boardTemplate === 'kanban';
  const isTimeline  = boardTemplate === 'timeline';

  const [activeTab, setActiveTab]               = useState<TabKey>('tasks');
  const [dialogVisible, setDialogVisible]       = useState(false);
  const [editingNode, setEditingNode]           = useState<NodeItem | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [viewMode, setViewMode]                 = useState<'structured' | 'freeflow'>(isFlowchart ? 'freeflow' : 'structured');
  const [typeMenuVisible, setTypeMenuVisible]   = useState(false);
  const [selectedType, setSelectedType]         = useState<string | undefined>(undefined);
  const [aiModalVisible, setAiModalVisible]     = useState(false);
  const [aiPrompt, setAiPrompt]                 = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareEmail, setShareEmail]             = useState('');
  const [kanbanTargetStatus, setKanbanTargetStatus] = useState<TaskStatus | undefined>(undefined);

  // If template changes or is resolved, ensure flowchart and mindmap boards stay in freeflow
  useEffect(() => {
    if (isFlowchart || isMindmap) {
      setViewMode('freeflow');
    }
  }, [isFlowchart, isMindmap]);


  /* Navigator header'ını kapat — kendi toolbar'ımızı kullanıyoruz */
  useEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);
  useEffect(() => { selectBoard(boardId); }, [boardId, selectBoard]);

  /* ─── Store actions ─── */
  const handleAddNode = (data: { title: string; content: string; type: string; color: string; startDate?: string; endDate?: string; progress?: number }) => {
    if (data.type === 'mindmap_root') {
      const hasRoot = activeBoard?.nodes.some(n => n.type === 'mindmap_root');
      if (hasRoot) {
        Alert.alert('Hata', 'Zihin haritasında sadece bir adet Merkez Konu bulunabilir.');
        return;
      }
    }
    const today = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    const newNode: NodeItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: data.type,
      position: { x: 0, y: 0 },
      data: {
        title:   data.title,
        content: data.content,
        color:   data.color,
        status:  isKanban ? (kanbanTargetStatus || 'todo') : (data.type === 'task' ? 'todo' : undefined),
        startDate: isTimeline ? (data.startDate || toDateStr(today)) : undefined,
        endDate:   isTimeline ? (data.endDate   || toDateStr(new Date(today.getTime() + 7 * 86400000))) : undefined,
        progress:  isTimeline ? (data.progress ?? 0) : undefined,
      },
    };
    addNode(newNode);
    saveBoard();
    setKanbanTargetStatus(undefined);
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
    updates: { title: string; content: string; color: string; assignee?: string; status?: TaskStatus; startDate?: string; endDate?: string; progress?: number },
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

  const handleShareBoard = async () => {
    if (!shareEmail.trim()) return;
    try {
      await shareBoard(boardId, shareEmail.trim());
      setShareEmail('');
      setShareModalVisible(false);
      Alert.alert('Başarılı', 'Pano paylaşıldı. Artık bir ekip panosu olarak kullanılabilir.');
    } catch (err) {
      Alert.alert('Hata', 'Pano paylaşılamadı.');
    }
  };

  /* ─── Derived lists ─── */
  const tasks     = activeBoard?.nodes.filter((n) => n.type === 'task') ?? [];
  const notes     = activeBoard?.nodes.filter((n) => n.type === 'note')  ?? [];
  const flowNodes = activeBoard?.nodes.filter((n) => FLOW_TYPES.includes(n.type)) ?? [];

  // Flowchart boards: only a Notes tab (flow elements shown inline, no task tab)
  // Basic boards: Tasks + Notes tabs
  const tabItems: { key: TabKey; icon: string; label: string; count: number }[] =
    isFlowchart
      ? [{ key: 'notes', icon: 'file-text', label: 'Notlar', count: notes.length }]
      : [
          { key: 'tasks', icon: 'check-square', label: 'Görevler', count: tasks.length },
          { key: 'notes', icon: 'file-text', label: 'Notlar',   count: notes.length },
        ];


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
          <Feather name="alert-triangle" size={40} color={colors.error} style={{ marginBottom: 12 }} />
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
            {boardTemplate === 'flowchart'
              ? `${flowNodes.length} şekil · ${notes.length} not`
              : boardTemplate === 'mindmap'
              ? `${(activeBoard?.nodes || []).filter(n => n.type.startsWith('mindmap_')).length} konu · ${notes.length} not`
              : isTimeline
              ? `${activeBoard.nodes.length} görev`
              : `${tasks.length} görev · ${notes.length} not`
            }
          </Text>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {!isFlowchart && !isMindmap && !isKanban && !isTimeline && (
            <TouchableOpacity onPress={() => setViewMode(v => v === 'structured' ? 'freeflow' : 'structured')} style={styles.toolbarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name={viewMode === 'structured' ? 'image' : 'list'} size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleTheme} style={styles.toolbarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name={isDark ? "sun" : "moon"} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShareModalVisible(true)} style={styles.toolbarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {isTimeline ? (
        <TimelineView
          nodes={activeBoard.nodes}
          onNodeEdit={handleOpenEdit}
          onAddNode={() => {
            setSelectedType('task');
            setDialogVisible(true);
          }}
          onAiGenerate={() => setAiModalVisible(true)}
          onUpdateNode={(id, data) => {
            updateNode(id, data);
            saveBoard();
          }}
        />
      ) : isKanban ? (
        <KanbanView
          boardId={boardId}
          nodes={activeBoard.nodes}
          onNodeDelete={handleDelete}
          onNodeEdit={handleOpenEdit}
          onAddNode={(status, type) => {
            setKanbanTargetStatus(status);
            setSelectedType(type);
            setDialogVisible(true);
          }}
          onUpdateNodeStatus={(id, status) => {
            updateNode(id, { status });
            saveBoard();
          }}
        />
      ) : (isFlowchart || isMindmap || viewMode === 'freeflow') ? (
        <View style={{ flex: 1 }}>
          {!isFlowchart && !isMindmap && (
            <Text style={{ textAlign: 'center', padding: 8, fontSize: 12, color: colors.textSecondary, backgroundColor: colors.surface }}>
              İlişki (ok) kurmak için önce bir karta, sonra diğer karta dokunun.
            </Text>
          )}
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
          {/* ── Tab Bar ── */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {tabItems.map(({ key, icon, label, count }) => {
              const isActive = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.tabItem, isActive && { borderBottomColor: colors.accent, borderBottomWidth: 2.5 }]}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.7}
                >
                  <Feather name={icon as any} size={14} color={isActive ? colors.accent : colors.textSecondary} style={{ marginRight: 2 }} />
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

            {/* ── GÖREVLER SEKMESİ (basic only) ── */}
        {!isFlowchart && activeTab === 'tasks' && (
          <>
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="list" size={48} color={colors.textSecondary} style={{ marginBottom: 14 }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Henüz görev yok</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  + butonuna basarak görev ekleyebilirsin.
                </Text>
              </View>
            ) : (
              TASK_GROUPS.map(({ key, label, color, emptyLabel, icon }) => {
                const groupNodes = tasks.filter(
                  (n) => (n.data.status ?? 'todo') === key,
                );
                return (
                  <View key={key} style={styles.group}>
                    <View style={styles.groupHeader}>
                      <Feather name={icon as any} size={14} color={color} />
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

        {/* ── FLOWCHART ANA İÇERİĞİ (tab yok, her şey inline) ── */}
        {isFlowchart && (
          <>
            {/* Akış elemanları — geometrik kartlar */}
            <View style={styles.flowSection}>
              <View style={styles.flowSectionHeader}>
                <Ionicons name="git-network-outline" size={18} color={colors.accent} />
                <Text style={[styles.flowSectionTitle, { color: colors.textPrimary }]}>Akış Öğeleri</Text>
                <View style={[styles.flowSectionBadge, { backgroundColor: `${colors.accent}20` }]}>
                  <Text style={[styles.flowSectionBadgeText, { color: colors.accent }]}>{flowNodes.length}</Text>
                </View>
              </View>

              {flowNodes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="git-merge" size={48} color={colors.textSecondary} style={{ marginBottom: 14 }} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Henüz akış öğesi yok</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    + butonuna basarak akış elemanı ekleyebilirsin.
                  </Text>
                </View>
              ) : (
                flowNodes.map((node) => (
                  <FlowNodeCard
                    key={node.id}
                    node={node}
                    onDelete={handleDelete}
                    onEdit={handleOpenEdit}
                  />
                ))
              )}
            </View>

            {/* Notlar bölümü (flowchart panolarında da notlar eklenebilir) */}
            {notes.length > 0 && (
              <View style={styles.group}>
                <View style={styles.groupHeader}>
                  <Feather name="file-text" size={14} color="#10b981" />
                  <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>Notlar</Text>
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
            )}
          </>
        )}


        {/* ── NOTLAR SEKMESİ ── */}
        {activeTab === 'notes' && (
          <>
            {notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={48} color={colors.textSecondary} style={{ marginBottom: 14 }} />
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
                  <Feather name="file-text" size={14} color="#10b981" />
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

      {/* ── Type Selector Menu ── */}
      {typeMenuVisible && (
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTypeMenuVisible(false)} />
          <View style={[styles.typeMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(isMindmap
              ? [
                  { key: 'mindmap_root',  label: 'Merkez Konu', icon: 'git-commit',      provider: 'Feather' },
                  { key: 'mindmap_main',  label: 'Ana Başlık',  icon: 'git-branch',      provider: 'Feather' },
                  { key: 'mindmap_sub',   label: 'Alt Başlık',   icon: 'corner-down-right', provider: 'Feather' },
                  { key: 'note',          label: 'Not',         icon: 'file-text',       provider: 'Feather' },
                  { key: 'ai',            label: 'AI ile Oluştur', icon: 'zap',          provider: 'Feather' },
                ]
              : isFlowchart
              ? [
                  { key: 'flow_start',    label: 'Başlangıç', icon: 'ellipse-outline', provider: 'Ionicons' },
                  { key: 'flow_process',  label: 'İşlem',     icon: 'square-outline',  provider: 'Ionicons' },
                  { key: 'flow_decision', label: 'Karar',     icon: 'rhombus-outline', provider: 'MaterialCommunityIcons' },
                  { key: 'flow_data',     label: 'Veri',      icon: 'card-outline',    provider: 'Ionicons' },
                  { key: 'note',          label: 'Not',      icon: 'file-text',       provider: 'Feather' },
                  { key: 'ai',            label: 'AI ile Oluştur', icon: 'zap',       provider: 'Feather' },
                ]
              : isTimeline
              ? [
                  { key: 'ai', label: 'AI ile Oluştur', icon: 'zap', provider: 'Feather' },
                ]
              : [
                  { key: 'task', label: 'Görev', icon: 'check-square', provider: 'Feather' },
                  { key: 'note', label: 'Not',   icon: 'file-text',    provider: 'Feather' },
                  { key: 'ai',   label: 'AI ile Oluştur', icon: 'zap', provider: 'Feather' },
                ]
            ).map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItem}
                onPress={() => {
                  if (item.key === 'ai') {
                    setAiModalVisible(true);
                  } else {
                    setSelectedType(item.key);
                    setDialogVisible(true);
                  }
                  setTypeMenuVisible(false);
                }}
              >
                <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                <View style={[styles.menuItemIcon, { backgroundColor: `${colors.accent}15` }]}>
                  {item.provider === 'Feather' && <Feather name={item.icon as any} size={18} color={colors.accent} />}
                  {item.provider === 'Ionicons' && <Ionicons name={item.icon as any} size={18} color={colors.accent} />}
                  {item.provider === 'MaterialCommunityIcons' && <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.accent} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── FAB ── */}
      {!isKanban && !isTimeline && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => setTypeMenuVisible(!typeMenuVisible)}
          activeOpacity={0.85}
        >
          <Feather name={typeMenuVisible ? "x" : "plus"} size={30} color={colors.accentText} />
        </TouchableOpacity>
      )}

      {/* ── Add Dialog ── */}
      <AddNodeDialog
        visible={dialogVisible}
        onClose={() => {
          setDialogVisible(false);
          setSelectedType(undefined);
        }}
        onAdd={handleAddNode}
        boardTemplate={boardTemplate}
        initialType={selectedType}
      />

      {/* ── AI Prompt Modal ── */}
      <Modal
        visible={aiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.aiModalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAiModalVisible(false)} />
          <View style={[styles.aiModal, { backgroundColor: isDark ? '#1C1C28' : '#FFF' }]}>
            {/* Modal Handle */}
            <View style={styles.modalHandleContainer}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.aiModalHeader}>
              <View style={[styles.aiIconBadge, { backgroundColor: `${colors.accent}15` }]}>
                <Feather name="zap" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiModalTitle, { color: colors.textPrimary }]}>
                  {isTimeline ? 'Zaman Çizelgesi Oluştur'
                    : isMindmap ? 'Zihin Haritası Oluştur'
                    : isKanban  ? 'Kanban Panosu Oluştur'
                    : isFlowchart ? 'Akış Şeması Oluştur'
                    : 'AI ile Tasarla'}
                </Text>
                <Text style={[styles.aiModalSubtitle, { color: colors.textSecondary }]}>
                  {isTimeline ? 'Proje görevleri ve tarihlerini AI ile oluşturun'
                    : isMindmap ? 'Zihin haritası düğümlerini AI ile yapılandırın'
                    : isKanban  ? 'Kanban görevlerini AI ile sütunlara dağıtın'
                    : isFlowchart ? 'Akış şeması adımlarını AI ile tasarlayın'
                    : 'Süreci yapay zeka ile otomatikleştirin'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAiModalVisible(false)} style={styles.aiCloseBtn}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.aiInputContainer, { backgroundColor: isDark ? '#252538' : '#F8F9FA', borderColor: colors.border }]}>
              <TextInput
                style={[styles.aiInput, { color: colors.textPrimary }]}
                placeholder={
                  isTimeline  ? 'Örn: Q3 2026 ürün lansmanı planı, pazarlama ve geliştirme görevleriyle'
                  : isMindmap ? 'Örn: Proje yönetimi konusu için ana dallar ve alt konular'
                  : isKanban  ? 'Örn: Yazılım geliştirme sprint süreci'
                  : isFlowchart ? 'Örn: Müşteri destek süreci, onay adımları dahil'
                  : 'Nasıl bir akış hayal ediyorsunuz?'
                }
                placeholderTextColor={colors.textMuted}
                multiline
                value={aiPrompt}
                onChangeText={setAiPrompt}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.aiSubmitBtn, { backgroundColor: colors.accent, opacity: !aiPrompt.trim() ? 0.6 : 1 }]}
              disabled={!aiPrompt.trim() || isLoading}
              onPress={async () => {
                await generateAI(boardId, aiPrompt);
                setAiPrompt('');
                setAiModalVisible(false);
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.aiSubmitText, { color: '#FFF' }]}>
                    {isTimeline ? 'Görevleri Oluştur'
                      : isMindmap ? 'Haritayı Oluştur'
                      : isKanban  ? 'Panoyu Oluştur'
                      : isFlowchart ? 'Akışı Oluştur'
                      : 'Süreci Oluştur'}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            
            <Text style={styles.aiFooterHint}>
              AI tarafından oluşturulan öğeleri daha sonra düzenleyebilirsiniz.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Share Modal ── */}
      <Modal visible={shareModalVisible} transparent animationType="fade">
        <Pressable style={styles.aiModalOverlay} onPress={() => setShareModalVisible(false)}>
          <View style={[styles.aiModal, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            <View style={styles.aiModalHeader}>
              <View style={[styles.aiIconBadge, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="share-social-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiModalTitle, { color: colors.textPrimary }]}>Panoyu Paylaş</Text>
                <Text style={[styles.aiModalSubtitle, { color: colors.textSecondary }]}>Pano otomatik olarak ekibe dönüşür</Text>
              </View>
            </View>

            <Text style={{ color: colors.textSecondary, marginBottom: 16, fontSize: 13 }}>
              Bu panoyu bir kullanıcıyla paylaşın. Pano içeriği ekip üyeleriyle ortak hale gelecektir.
            </Text>

            <View style={[styles.aiInputContainer, { backgroundColor: isDark ? '#252538' : '#F8F9FA', borderColor: colors.border, minHeight: 60, height: 60, marginBottom: 20 }]}>
              <TextInput
                style={[styles.aiInput, { color: colors.textPrimary, height: 40 }]}
                placeholder="E-posta adresi..."
                placeholderTextColor={colors.textMuted}
                value={shareEmail}
                onChangeText={setShareEmail}
                autoFocus
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShareModalVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aiSubmitBtn, { flex: 2, height: 56, backgroundColor: colors.accent }]} onPress={handleShareBoard}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Paylaş</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

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
  groupTitle:     { fontSize: 15, fontWeight: '700', flex: 1 },
  groupBadge:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  groupBadgeText: { fontSize: 12, fontWeight: '700' },
  groupEmpty:     { fontSize: 13, fontStyle: 'italic', paddingLeft: 18, paddingBottom: 4 },

  /* Nodes */
  nodeSpacing: { marginBottom: 10 },

  /* Empty */
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  /* Flow Section (flowchart boards — no tab) */
  flowSection: { marginBottom: 28 },
  flowSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  flowSectionTitle: { fontSize: 16, fontWeight: '800', flex: 1, letterSpacing: -0.2 },
  flowSectionBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  flowSectionBadgeText: { fontSize: 12, fontWeight: '700' },

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
  /* Type Menu */
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 90,
    paddingRight: 20,
    zIndex: 100,
  },
  typeMenu: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* AI Modal Redesign */
  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  aiModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHandleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  aiIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  aiModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  aiModalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  aiCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInputContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
    minHeight: 140,
  },
  aiInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  aiSubmitBtn: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  aiSubmitText: {
    fontSize: 17,
    fontWeight: '700',
  },
  aiFooterHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default BoardScreen;
