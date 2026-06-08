import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
  Alert, ScrollView, Image, Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useBoardStore } from '../store/useBoardStore';
import { useTeamStore } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFolderStore } from '../store/useFolderStore';
import { userAPI } from '../services/api';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { Board } from '../types/models';
import { Feather, Ionicons } from '@expo/vector-icons';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const FLOW_TYPES = ['flow_start', 'flow_end', 'flow_process', 'flow_decision', 'flow_data'];

const TEMPLATES = [
  { id: 'basic',         title: 'Temel İş Akışı', icon: 'list', desc: 'Görev ve not tabanlı standart pano' },
  { id: 'templates_tab', title: 'Şablonlar',      icon: 'layers', desc: 'Hazır şablonları inceleyin' },
];

const MOBILE_TEMPLATES = [
  {
    id: 'flowchart',
    title: 'Akış Şeması',
    desc: 'Karar ve süreç akışları için elmas, kapsül ve süreç kartları.',
    icon: 'git-merge',
    available: true,
  },
  {
    id: 'mindmap',
    title: 'Zihin Haritası',
    desc: 'Fikirlerinizi görselleştirin, beyin fırtınası yapın ve yapılandırın.',
    icon: 'aperture',
    available: true,
  },
  {
    id: 'kanban',
    title: 'Kanban Panosu',
    desc: 'Projelerinizi ve görevlerinizi sütunlar halinde organize edin.',
    icon: 'trello',
    available: true,
  },
  {
    id: 'timeline',
    title: 'Zaman Çizelgesi',
    desc: 'Kilometre taşları ve proje planları için zaman eksenli takip.',
    icon: 'calendar',
    available: true,
  },
];

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Tigger',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Cookie',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Daisy',
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { boards, fetchBoards, createBoard, deleteBoard, updateBoardDetails, togglePin, isLoading, error } = useBoardStore();
  const { teams, fetchTeams, createTeam, inviteMember, deleteTeam, updateTeam } = useTeamStore();
  const { user, updateProfile } = useAuthStore();
  const { colors, isDark } = useTheme();
  
  const { folders, fetchFolders, createFolder, updateFolder, deleteFolder, addBoardToFolder, removeBoardFromFolder } = useFolderStore();
  
  const [isModalVisible, setIsModalVisible]       = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingBoard, setEditingBoard]           = useState<Board | null>(null);
  const [newBoardTitle, setNewBoardTitle]         = useState('');
  const [selectedTemplate, setSelectedTemplate]   = useState('basic');
  const [activeTab, setActiveTab]                 = useState('boards');

  // Teams state
  const [isCreateTeamVisible, setIsCreateTeamVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isInviteVisible, setIsInviteVisible] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isEditTeamVisible, setIsEditTeamVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [templateToCreate, setTemplateToCreate] = useState<string | null>(null);

  // Folders state
  const [isCreateFolderVisible, setIsCreateFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isEditFolderVisible, setIsEditFolderVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);
  const [movingBoard, setMovingBoard] = useState<any>(null);
  const [openFolderIds, setOpenFolderIds] = useState<string[]>([]);

  const FOLDER_COLORS = [
    colors.accent,
    '#1d4ed8',
    '#15803d',
    '#a16207',
    '#be185d',
    '#c2410c',
  ];

  const toggleFolder = (folderId: string) => {
    setOpenFolderIds(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  useEffect(() => { 
    fetchBoards(); 
    fetchTeams();
    fetchFolders();
  }, [fetchBoards, fetchTeams, fetchFolders]);

  const isFlowBoard = (item: Board) =>
    item.template === 'flowchart' ||
    (item.nodes || []).some(n => FLOW_TYPES.includes(n.type));

  const getBoardTemplate = (item: Board) => {
    if (item.template) return item.template;
    if ((item.nodes || []).some(n => FLOW_TYPES.includes(n.type))) return 'flowchart';
    if ((item.nodes || []).some(n => n.type.startsWith('mindmap_'))) return 'mindmap';
    // Timeline: nodes with startDate/endDate fields
    if ((item.nodes || []).some(n => n.data?.startDate || n.data?.endDate)) return 'timeline';
    return 'basic';
  };

  const displayedBoards = boards
    .filter((b) => {
      if (activeTab === 'flow') return isFlowBoard(b);
      if (activeTab === 'teams') return !!b.team_id;
      return true;
    })
    .sort((a, b) => {
      if (a.pinned === b.pinned) return 0;
      return a.pinned ? -1 : 1;
    });

  const renderTeamItem = ({ item }: { item: any }) => {
    const renderRightActions = () => (
      <View style={{ flexDirection: 'row', width: 160 }}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#f59e0b', width: 80 }]}
          onPress={() => {
            setEditingTeam(item);
            setEditTeamName(item.name);
            setIsEditTeamVisible(true);
          }}
        >
          <Feather name="edit-2" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef4444', width: 80 }]}
          onPress={() => {
            Alert.alert('Ekibi Sil', `${item.name} ekibini silmek istediğinize emin misiniz? DİKKAT: Ekibe ait tüm panolar da silinecektir!`, [
              { text: 'İptal', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => deleteTeam(item.id) },
            ]);
          }}
        >
          <Feather name="trash-2" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
        <View style={[styles.boardCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: colors.border, marginHorizontal: 16, marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: `${colors.accent}15` }]}>
                <Feather name="users" size={24} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.boardTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.boardMeta, { color: colors.textSecondary }]}>
                  {item.members?.length || 0} Üye
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.inviteBtnSmall, { backgroundColor: colors.accent }]}
              onPress={() => {
                setSelectedTeamId(item.id);
                setIsInviteVisible(true);
              }}
            >
              <Feather name="user-plus" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Swipeable>
    );
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        await userAPI.updateProfile({ avatar_url: base64 });
        updateProfile({ avatar_url: base64 });
        Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
      } catch (err) {
        Alert.alert('Hata', 'Fotoğraf güncellenemedi.');
      }
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    await createTeam(newTeamName.trim());
    setNewTeamName('');
    setIsCreateTeamVisible(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedTeamId) return;
    await inviteMember(selectedTeamId, inviteEmail.trim());
    setInviteEmail('');
    setIsInviteVisible(false);
    Alert.alert('Başarılı', 'Davet gönderildi.');
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim() || isLoading) return;
    const createdBoard = await createBoard(newBoardTitle.trim(), selectedTemplate);
    if (createdBoard) {
      setNewBoardTitle('');
      setSelectedTemplate('basic');
      setIsModalVisible(false);
      navigation.navigate('Board', { boardId: createdBoard.id, template: createdBoard.template || selectedTemplate });
    }
  };

  const handleCreateTemplateBoard = async () => {
    if (!newBoardTitle.trim() || !templateToCreate || isLoading) return;
    const createdBoard = await createBoard(newBoardTitle.trim(), templateToCreate);
    if (createdBoard) {
      setNewBoardTitle('');
      setTemplateToCreate(null);
      setIsTemplateModalVisible(false);
      navigation.navigate('Board', { boardId: createdBoard.id, template: createdBoard.template || templateToCreate });
    }
  };

  const renderBoardItem = ({ item }: { item: Board }) => {
    const template = getBoardTemplate(item);
    const isFlow = template === 'flowchart';
    const isMind = template === 'mindmap';
    const isKanban = template === 'kanban';
    const isTimeline = template === 'timeline';

    const renderRightActions = (progress: any, dragX: any) => {
      return (
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4b5563' }]}
            onPress={() => {
              setEditingBoard(item);
              setIsEditModalVisible(true);
            }}
          >
            <Feather name="edit-2" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={() => {
              Alert.alert('Sil', 'Bu panoyu silmek istediğinize emin misiniz?', [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteBoard(item.id) },
              ]);
            }}
          >
            <Feather name="trash-2" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
      return (
        <TouchableOpacity
          style={[styles.leftActions, { backgroundColor: item.pinned ? '#6b7280' : '#f59e0b' }]}
          onPress={() => togglePin(item.id)}
        >
          <Ionicons name="pin" size={20} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
            {item.pinned ? 'Kaldır' : 'Sabitle'}
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
      >
        <TouchableOpacity
          style={[styles.boardCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: colors.border }]}
          onPress={() => navigation.navigate('Board', { boardId: item.id, template: template })}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.iconBox, { backgroundColor: (isFlow || isMind || isKanban || isTimeline) ? `${colors.accent}15` : '#6b728015' }]}>
              <Feather name={isFlow ? 'git-merge' : isMind ? 'aperture' : isKanban ? 'columns' : isTimeline ? 'calendar' : 'list'} size={24} color={(isFlow || isMind || isKanban || isTimeline) ? colors.accent : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.boardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                {item.pinned && <Ionicons name="pin" size={12} color={colors.accent} />}
              </View>
              <Text style={[styles.boardMeta, { color: colors.textSecondary }]}>
                {isFlow ? 'Akış Şeması' : isMind ? 'Zihin Haritası' : isKanban ? 'Kanban Panosu' : isTimeline ? 'Zaman Çizelgesi' : 'Temel İş Akışı'} · {item.nodes?.length || 0} öğe
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.border} />
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderBoardItemWithFolderActions = (item: Board) => {
    const template = getBoardTemplate(item);
    const isFlow = template === 'flowchart';
    const isMind = template === 'mindmap';
    const isKanban = template === 'kanban';
    const isTimeline = template === 'timeline';

    const renderRightActions = (progress: any, dragX: any) => {
      return (
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4b5563' }]}
            onPress={() => {
              setEditingBoard(item);
              setIsEditModalVisible(true);
            }}
          >
            <Feather name="edit-2" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={() => {
              Alert.alert('Sil', 'Bu panoyu silmek istediğinize emin misiniz?', [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteBoard(item.id) },
              ]);
            }}
          >
            <Feather name="trash-2" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
      return (
        <TouchableOpacity
          style={[styles.leftActions, { backgroundColor: item.pinned ? '#6b7280' : '#f59e0b' }]}
          onPress={() => togglePin(item.id)}
        >
          <Ionicons name="pin" size={20} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
            {item.pinned ? 'Kaldır' : 'Sabitle'}
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable
        key={item.id}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
      >
        <TouchableOpacity
          style={[styles.boardCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: colors.border, marginHorizontal: 16, marginBottom: 10 }]}
          onPress={() => navigation.navigate('Board', { boardId: item.id, template: template })}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.iconBox, { backgroundColor: (isFlow || isMind || isKanban || isTimeline) ? `${colors.accent}15` : '#6b728015' }]}>
              <Feather name={isFlow ? 'git-merge' : isMind ? 'aperture' : isKanban ? 'columns' : isTimeline ? 'calendar' : 'list'} size={24} color={(isFlow || isMind || isKanban || isTimeline) ? colors.accent : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.boardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                {item.pinned && <Ionicons name="pin" size={12} color={colors.accent} />}
              </View>
              <Text style={[styles.boardMeta, { color: colors.textSecondary }]}>
                {isFlow ? 'Akış Şeması' : isMind ? 'Zihin Haritası' : isKanban ? 'Kanban Panosu' : isTimeline ? 'Zaman Çizelgesi' : 'Temel İş Akışı'} · {item.nodes?.length || 0} öğe
              </Text>
            </View>
            {/* Folder Move Button */}
            {!item.team_id && (
              <TouchableOpacity 
                onPress={() => { setMovingBoard(item); setIsMoveModalVisible(true); }}
                style={{ padding: 6 }}
              >
                <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <Feather name="chevron-right" size={18} color={colors.border} />
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (isLoading && boards.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error && boards.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={{ color: '#FF5252', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={fetchBoards}>
          <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: 'bold' }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {activeTab === 'profile' ? (
        <View style={styles.profileContainer}>
          <View style={styles.profileHeader}>
            <View style={{ position: 'relative', width: 100, height: 100, marginBottom: 16 }}>
              <Pressable 
                onPress={() => {
                  console.log('Avatar pressed');
                  setIsAvatarModalVisible(true);
                }} 
                style={({ pressed }) => [
                  styles.avatarPlaceholder, 
                  { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Feather name="user" size={40} color="#FFF" />
                )}
              </Pressable>
              <Pressable 
                style={({ pressed }) => [
                  styles.editAvatarBtn, 
                  { opacity: pressed ? 0.8 : 1, zIndex: 999 }
                ]}
                onPress={() => {
                  console.log('Camera icon pressed');
                  setIsAvatarModalVisible(true);
                }}
                hitSlop={15}
              >
                <Feather name="camera" size={16} color="#000" />
              </Pressable>
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary, marginTop: 12 }]}>{user?.email}</Text>
          </View>

          <View style={styles.profileSection}>
            <TouchableOpacity style={[styles.profileOption, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <Feather name="settings" size={20} color={colors.textSecondary} />
              <Text style={[styles.profileOptionText, { color: colors.textPrimary }]}>Ayarlar</Text>
              <Feather name="chevron-right" size={20} color={colors.border} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileOption, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <Feather name="shield" size={20} color={colors.textSecondary} />
              <Text style={[styles.profileOptionText, { color: colors.textPrimary }]}>Gizlilik ve Güvenlik</Text>
              <Feather name="chevron-right" size={20} color={colors.border} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => useAuthStore.getState().logout()}
              style={[styles.profileOption, { marginTop: 20 }]}
            >
              <Feather name="log-out" size={20} color="#ef4444" />
              <Text style={[styles.profileOptionText, { color: '#ef4444' }]}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : activeTab === 'flow' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.templatesHeader}>
            <Text style={[styles.templatesMainTitle, { color: colors.textPrimary }]}>Şablonlar</Text>
            <Text style={[styles.templatesSubtitle, { color: colors.textSecondary }]}>
              Projelerinize hızlıca başlamak için bir şablon seçin.
            </Text>
          </View>

          {MOBILE_TEMPLATES.map((item) => {
            const isAvailable = item.available;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.templateListItem,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFF',
                    borderColor: colors.border,
                    opacity: isAvailable ? 1 : 0.6,
                  }
                ]}
                disabled={!isAvailable}
                onPress={() => {
                  setTemplateToCreate(item.id);
                  setIsTemplateModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={[
                    styles.templateIconBox,
                    { backgroundColor: isAvailable ? `${colors.accent}15` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }
                  ]}>
                    <Feather
                      name={item.icon as any}
                      size={24}
                      color={isAvailable ? colors.accent : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.templateListTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.templateListDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                  {isAvailable ? (
                    <View style={[styles.templateUseBtn, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.templateUseBtnText, { color: isDark ? '#000' : '#FFF' }]}>Kullan</Text>
                    </View>
                  ) : (
                    <View style={[styles.templateBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                      <Text style={[styles.templateBadgeText, { color: colors.textSecondary }]}>Yakında</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : activeTab === 'teams' ? (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          renderItem={renderTeamItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 100, paddingHorizontal: 32 }}>
              <Feather name="users" size={40} color={colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                Henüz bir ekibiniz yok.
              </Text>
            </View>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}>
          {/* Kişisel Klasörler */}
          {folders.filter(f => !f.is_team_folder).map(folder => {
            const isExpanded = openFolderIds.includes(folder.id);
            const folderBoards = boards.filter(b => !b.team_id && (folder.board_ids || []).includes(b.id));
            return (
              <View key={folder.id} style={{ marginBottom: 8 }}>
                {/* Klasör Başlığı */}
                <TouchableOpacity
                  style={[{
                    flexDirection: 'row', alignItems: 'center', padding: 14,
                    borderRadius: 14, marginBottom: 4,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderWidth: folder.color ? 1.5 : 1,
                    borderColor: folder.color ? folder.color + '60' : colors.border,
                  }]}
                  onPress={() => toggleFolder(folder.id)}
                  onLongPress={() => {
                    setEditingFolder(folder);
                    setEditFolderName(folder.name);
                    setIsEditFolderVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[{
                    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                    backgroundColor: folder.color ? folder.color + '20' : colors.accentSoft,
                  }]}>
                    <Feather name="folder" size={18} color={isExpanded ? (folder.color || colors.accent) : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{folder.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>{folderBoards.length} pano</Text>
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Klasör İçindeki Panolar */}
                {isExpanded && folderBoards.map(board => (
                  <View key={board.id} style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: folder.color ? folder.color + '50' : colors.accentSoft, marginLeft: 18, marginBottom: 6 }}>
                    {renderBoardItemWithFolderActions(board)}
                  </View>
                ))}
                {isExpanded && folderBoards.length === 0 && (
                  <View style={{ paddingLeft: 36, paddingVertical: 10 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Klasör boş.</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Klasörsüz Kişisel Panolar */}
          {(() => {
            const folderBoardIds = new Set(folders.filter(f => !f.is_team_folder).flatMap(f => f.board_ids || []));
            const unfoldered = boards.filter(b => !b.team_id && !folderBoardIds.has(b.id));
            if (unfoldered.length === 0 && folders.filter(f => !f.is_team_folder).length === 0) {
              return (
                <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
                  <Feather name="inbox" size={40} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
                    Henüz pano yok.{'\n'}Sağ alttaki + butonuna basarak oluşturabilirsin.
                  </Text>
                </View>
              );
            }
            return unfoldered.map(board => renderBoardItemWithFolderActions(board));
          })()}

          {/* Ekip Klasörleri */}
          {folders.filter(f => f.is_team_folder).length > 0 && (
            <View style={{ marginTop: 20, marginBottom: 8, paddingHorizontal: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 }}>Ekip Klasörleri</Text>
            </View>
          )}
          {folders.filter(f => f.is_team_folder).map(folder => {
            const isExpanded = openFolderIds.includes(folder.id);
            const folderBoards = boards.filter(b => (folder.board_ids || []).includes(b.id));
            return (
              <View key={folder.id} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  style={[{
                    flexDirection: 'row', alignItems: 'center', padding: 14,
                    borderRadius: 14, marginBottom: 4,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderWidth: 1.5,
                    borderColor: colors.accent + '40',
                  }]}
                  onPress={() => toggleFolder(folder.id)}
                  activeOpacity={0.7}
                >
                  <View style={[{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.accentSoft }]}>
                    <Feather name="folder" size={18} color={isExpanded ? colors.accent : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{folder.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>{folderBoards.length} ekip panosu</Text>
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {isExpanded && folderBoards.map(board => (
                  <View key={board.id} style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: colors.accentSoft, marginLeft: 18, marginBottom: 6 }}>
                    {renderBoardItemWithFolderActions(board)}
                  </View>
                ))}
              </View>
            );
          })}

          {/* Yeni Klasör Butonu */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginTop: 12 }}
            onPress={() => setIsCreateFolderVisible(true)}
          >
            <Feather name="folder-plus" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Yeni Klasör Oluştur</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* FAB */}
      {activeTab !== 'profile' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => {
            if (activeTab === 'teams') return setIsCreateTeamVisible(true);
            setIsModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.fabText, { color: isDark ? '#000' : '#FFF' }]}>+</Text>
        </TouchableOpacity>
      )}

      {/* Create Folder Modal */}
      <Modal visible={isCreateFolderVisible} transparent animationType="slide" onRequestClose={() => setIsCreateFolderVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            <View style={styles.handleBar}><View style={[styles.handle, { backgroundColor: colors.border }]} /></View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Yeni Klasör</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}
              placeholder="Klasör adı..."
              placeholderTextColor={colors.textSecondary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsCreateFolderVisible(false); setNewFolderName(''); }}>
                <Text style={{ color: colors.textSecondary }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent }]}
                onPress={async () => {
                  if (!newFolderName.trim()) return;
                  await createFolder(newFolderName.trim());
                  setNewFolderName('');
                  setIsCreateFolderVisible(false);
                }}
              >
                <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: '700' }}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal visible={isEditFolderVisible} transparent animationType="fade" onRequestClose={() => setIsEditFolderVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            <View style={styles.handleBar}><View style={[styles.handle, { backgroundColor: colors.border }]} /></View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Klasörü Düzenle</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}
              value={editFolderName}
              onChangeText={setEditFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => {
                  Alert.alert('Klasörü Sil', 'Klasör silinecek. Panolar silinmez.', [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: async () => {
                      if (editingFolder) {
                        await deleteFolder(editingFolder.id);
                        setIsEditFolderVisible(false);
                      }
                    }},
                  ]);
                }}
              >
                <Text style={{ color: colors.error, fontWeight: '600' }}>Sil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent }]}
                onPress={async () => {
                  if (editingFolder && editFolderName.trim()) {
                    await updateFolder(editingFolder.id, { name: editFolderName.trim() });
                    setIsEditFolderVisible(false);
                  }
                }}
              >
                <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: '700' }}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Move Board to Folder Modal */}
      <Modal visible={isMoveModalVisible} transparent animationType="fade" onRequestClose={() => setIsMoveModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsMoveModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF', maxHeight: '60%' }]}>
            <View style={styles.handleBar}><View style={[styles.handle, { backgroundColor: colors.border }]} /></View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 16 }]}>Klasöre Taşı</Text>
            <ScrollView>
              {/* Klasörden Çıkar seçeneği */}
              {folders.filter(f => !f.is_team_folder && movingBoard && (f.board_ids || []).includes(movingBoard.id)).map(f => (
                <TouchableOpacity
                  key={'remove-' + f.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }}
                  onPress={async () => {
                    if (movingBoard) {
                      await removeBoardFromFolder(f.id, movingBoard.id);
                      setIsMoveModalVisible(false);
                    }
                  }}
                >
                  <Feather name="x-circle" size={20} color={colors.error} />
                  <Text style={{ color: colors.error, fontWeight: '600' }}>"{f.name}" klasöründen çıkar</Text>
                </TouchableOpacity>
              ))}
              {/* Klasörler listesi */}
              {folders.filter(f => !f.is_team_folder && movingBoard && !(f.board_ids || []).includes(movingBoard.id)).map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }}
                  onPress={async () => {
                    if (movingBoard) {
                      await addBoardToFolder(folder.id, movingBoard.id);
                      setIsMoveModalVisible(false);
                    }
                  }}
                >
                  <Feather name="folder" size={20} color={folder.color || colors.accent} />
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{folder.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 'auto' }}>{(folder.board_ids || []).length} pano</Text>
                </TouchableOpacity>
              ))}
              {folders.filter(f => !f.is_team_folder).length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ color: colors.textMuted }}>Henüz klasör yok.</Text>
                  <TouchableOpacity
                    style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.accent, borderRadius: 10 }}
                    onPress={() => { setIsMoveModalVisible(false); setIsCreateFolderVisible(true); }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Klasör Oluştur</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Create Team Modal */}
      <Modal visible={isCreateTeamVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            <View style={styles.handleBar}><View style={[styles.handle, { backgroundColor: colors.border }]} /></View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Yeni Ekip</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}
              placeholder="Ekip adı..."
              placeholderTextColor={colors.textSecondary}
              value={newTeamName}
              onChangeText={setNewTeamName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreateTeamVisible(false)}>
                <Text style={{ color: colors.textSecondary }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.accent }]} onPress={handleCreateTeam}>
                <Text style={{ color: colors.accentText }}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite Member Modal */}
      <Modal visible={isInviteVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setIsInviteVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF', width: '85%', alignSelf: 'center', marginBottom: 'auto', marginTop: 100, borderRadius: 20 }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Üye Davet Et</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}
              placeholder="E-posta adresi..."
              placeholderTextColor={colors.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoFocus
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsInviteVisible(false)}>
                <Text style={{ color: colors.textSecondary }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.accent }]} onPress={handleInvite}>
                <Text style={{ color: colors.accentText }}>Davet Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Create Board Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isLoading && setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            {/* Handle */}
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Yeni Pano</Text>

            {/* Template Selection */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Şablon Seç</Text>
            <View style={styles.templateRow}>
              {TEMPLATES.map(t => {
                const isSelected = selectedTemplate === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.templateCard,
                      {
                        backgroundColor: isSelected
                          ? `${colors.accent}18`
                          : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      if (t.id === 'templates_tab') {
                        setIsModalVisible(false);
                        setActiveTab('flow');
                      } else {
                        setSelectedTemplate(t.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name={t.icon as any} size={26} color={isSelected ? colors.accent : colors.textPrimary} style={{ marginBottom: 6 }} />
                    <Text style={[styles.templateTitle, { color: isSelected ? colors.accent : colors.textPrimary }]}>
                      {t.title}
                    </Text>
                    <Text style={[styles.templateDesc, { color: colors.textSecondary }]}>{t.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Board Name */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pano Adı</Text>
            <TextInput
              style={[styles.input, {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
              }]}
              placeholder="Pano başlığı..."
              placeholderTextColor={colors.textSecondary}
              value={newBoardTitle}
              onChangeText={setNewBoardTitle}
              autoFocus
              editable={!isLoading}
              returnKeyType="done"
              onSubmitEditing={handleCreateBoard}
            />

            {error && <Text style={{ color: '#FF5252', marginBottom: 12, fontSize: 13 }}>{error}</Text>}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setIsModalVisible(false); setSelectedTemplate('basic'); }}
                disabled={isLoading}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent, opacity: isLoading || !newBoardTitle.trim() ? 0.6 : 1 }]}
                onPress={handleCreateBoard}
                disabled={isLoading || !newBoardTitle.trim()}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={isDark ? '#000' : '#FFF'} />
                  : <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: '700', fontSize: 15 }}>Oluştur</Text>
                }
              </TouchableOpacity>
            </View>

            {Platform.OS === 'ios' && <View style={{ height: 16 }} />}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Template Create Board Modal */}
      <Modal
        visible={isTemplateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isLoading && setIsTemplateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Yeni {templateToCreate === 'flowchart' ? 'Akış Şeması' : 'Pano'}
            </Text>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pano Adı</Text>
            <TextInput
              style={[styles.input, {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
              }]}
              placeholder="Pano başlığı..."
              placeholderTextColor={colors.textSecondary}
              value={newBoardTitle}
              onChangeText={setNewBoardTitle}
              autoFocus
              editable={!isLoading}
              returnKeyType="done"
              onSubmitEditing={handleCreateTemplateBoard}
            />

            {error && <Text style={{ color: '#FF5252', marginBottom: 12, fontSize: 13 }}>{error}</Text>}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setIsTemplateModalVisible(false); setNewBoardTitle(''); setTemplateToCreate(null); }}
                disabled={isLoading}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent, opacity: isLoading || !newBoardTitle.trim() ? 0.6 : 1 }]}
                onPress={handleCreateTemplateBoard}
                disabled={isLoading || !newBoardTitle.trim()}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={isDark ? '#000' : '#FFF'} />
                  : <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: '700', fontSize: 15 }}>Oluştur</Text>
                }
              </TouchableOpacity>
            </View>

            {Platform.OS === 'ios' && <View style={{ height: 16 }} />}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Board Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Panoyu Düzenle</Text>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pano Adı</Text>
            <TextInput
              style={[styles.input, {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
              }]}
              value={editingBoard?.title}
              onChangeText={(t) => setEditingBoard(prev => prev ? { ...prev, title: t } : null)}
            />

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Ekip</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <TouchableOpacity
                style={[
                  styles.teamTag,
                  { 
                    backgroundColor: !editingBoard?.team_id ? colors.accent : (isDark ? '#2C2C2C' : '#F5F5F5'),
                    borderColor: !editingBoard?.team_id ? colors.accent : colors.border
                  }
                ]}
                onPress={() => setEditingBoard(prev => prev ? { ...prev, team_id: undefined } : null)}
              >
                <Text style={{ color: !editingBoard?.team_id ? colors.accentText : colors.textPrimary }}>Kişisel</Text>
              </TouchableOpacity>
              {teams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamTag,
                    { 
                      backgroundColor: editingBoard?.team_id === team.id ? colors.accent : (isDark ? '#2C2C2C' : '#F5F5F5'),
                      borderColor: editingBoard?.team_id === team.id ? colors.accent : colors.border
                    }
                  ]}
                  onPress={() => setEditingBoard(prev => prev ? { ...prev, team_id: team.id } : null)}
                >
                  <Text style={{ color: editingBoard?.team_id === team.id ? colors.accentText : colors.textPrimary }}>{team.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent }]}
                onPress={async () => {
                  if (editingBoard) {
                    await updateBoardDetails(editingBoard.id, { title: editingBoard.title, team_id: editingBoard.team_id });
                    setIsEditModalVisible(false);
                  }
                }}
              >
                <Text style={{ color: colors.accentText, fontWeight: '700' }}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        visible={isEditTeamVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditTeamVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF' }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Ekibi Düzenle</Text>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Ekip Adı</Text>
            <TextInput
              style={[styles.input, {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
              }]}
              value={editTeamName}
              onChangeText={setEditTeamName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditTeamVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent }]}
                onPress={async () => {
                  if (editingTeam && editTeamName.trim()) {
                    await updateTeam(editingTeam.id, editTeamName.trim());
                    setIsEditTeamVisible(false);
                  }
                }}
              >
                <Text style={{ color: colors.accentText, fontWeight: '700' }}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal
        visible={isAvatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c28' : '#FFF', height: 'auto', maxHeight: '70%' }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 20 }]}>Profil Fotoğrafı Seç</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
              {PRESET_AVATARS.map((url, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={async () => {
                    try {
                      await userAPI.updateProfile({ avatar_url: url });
                      updateProfile({ avatar_url: url });
                      setIsAvatarModalVisible(false);
                    } catch (err) {
                      Alert.alert('Hata', 'Profil fotoğrafı güncellenemedi.');
                    }
                  }}
                  style={[
                    styles.avatarOption,
                    { borderColor: user?.avatar_url === url ? colors.accent : 'transparent', borderWidth: 3 }
                  ]}
                >
                  <Image source={{ uri: url }} style={styles.avatarLarge} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 30, width: '100%' }]}
              onPress={() => setIsAvatarModalVisible(false)}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', textAlign: 'center' }}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('boards')}>
          <Feather name="grid" size={24} color={activeTab === 'boards' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.navText, { color: activeTab === 'boards' ? colors.accent : colors.textSecondary }]}>Boards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('flow')}>
          <Feather name="layers" size={24} color={activeTab === 'flow' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.navText, { color: activeTab === 'flow' ? colors.accent : colors.textSecondary }]}>Şablonlar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('teams')}>
          <Feather name="users" size={24} color={activeTab === 'teams' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.navText, { color: activeTab === 'teams' ? colors.accent : colors.textSecondary }]}>Teams</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
          <Feather name="user" size={24} color={activeTab === 'profile' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.navText, { color: activeTab === 'profile' ? colors.accent : colors.textSecondary }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  boardCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  boardTitle: { fontSize: 17, fontWeight: '700' },
  boardMeta:  { fontSize: 13, marginTop: 3 },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1000,
  },
  fabText: { fontSize: 34, marginTop: -2, textAlign: 'center', lineHeight: 40 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  handleBar: { alignItems: 'center', paddingVertical: 10 },
  handle:    { width: 40, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 20 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  templateRow:  { flexDirection: 'row', gap: 10, marginBottom: 20 },
  templateCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  templateTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  templateDesc:  { fontSize: 11, textAlign: 'center', lineHeight: 15 },

  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
  },

  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  profileContainer: {
    flex: 1,
    padding: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileSection: {
    marginTop: 10,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  profileOptionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  /* Swipe Actions */
  rightActions: {
    flexDirection: 'row',
    width: 140,
    marginBottom: 12,
  },
  leftActions: {
    flex: 1,
    marginBottom: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginLeft: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  inviteBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  avatarLarge: {
    width: '100%',
    height: '100%',
  },
  templatesHeader: {
    marginBottom: 20,
    marginTop: 10,
  },
  templatesMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  templatesSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  templateListItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  templateIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateListTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  templateListDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  templateUseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateUseBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  templateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default HomeScreen;
