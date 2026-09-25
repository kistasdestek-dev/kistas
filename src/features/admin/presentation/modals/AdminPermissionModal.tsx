import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassIconButton } from '../../../../shared/components/GlassIconButton';
import { AdminPermission, AdminUserSummary } from '../../domain/AdminModels';
import { AdminService } from '../../application/AdminService';
import { styles } from '../AdminDashboardScreen.styles';

export interface AdminPermissionModalProps {
  target: AdminUserSummary | null;
  isOwner: boolean;
  onClose: () => void;
  onSuccess: (message: string, icon: React.ComponentProps<typeof Ionicons>['name']) => void;
}

const ADMIN_PERMISSION_OPTIONS: Array<{
  key: AdminPermission;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { key: 'community', title: 'Mesajlar ve Yorumlar', description: 'Destek görüşmeleri ve yorum moderasyonu', icon: 'chatbubbles-outline' },
  { key: 'launches', title: 'Lansman İnceleme', description: 'Projeleri onaylama ve düzeltme isteme', icon: 'rocket-outline' },
  { key: 'blog', title: 'Blog Yönetimi', description: 'Blog içeriklerini oluşturma ve düzenleme', icon: 'newspaper-outline' },
];

export const AdminPermissionModal: React.FC<AdminPermissionModalProps> = ({
  target,
  isOwner,
  onClose,
  onSuccess,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setSelectedPermissions(target.adminPermissions || []);
      setError(null);
    }
  }, [target]);

  const togglePermission = (permission: AdminPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((item) => item !== permission) : [...prev, permission]
    );
  };

  const handleSave = async () => {
    if (!target || !isOwner || isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = await AdminService.setTeamMemberPermissions(target.id, selectedPermissions);
    setIsSaving(false);
    if (!result.success) {
      setError(result.error || 'Yetkiler güncellenemedi.');
      return;
    }
    const removed = selectedPermissions.length === 0;
    onClose();
    onSuccess(
      removed ? `“${target.fullName}” yönetim ekibinden çıkarıldı.` : `“${target.fullName}” için görev yetkileri güncellendi.`,
      removed ? 'person-remove-outline' : 'shield-checkmark-outline'
    );
  };

  return (
    <Modal
      visible={Boolean(target)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => !isSaving && onClose()}
    >
      <View style={styles.modalBackdrop}>
        <View accessibilityRole="alert" style={styles.permissionDialog}>
          <LinearGradient colors={['#173B72', '#3269C7', '#4F87DF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
            <View style={styles.dialogHeroGlow} />
            <View style={styles.dialogHeroIcon}><Ionicons name="shield-checkmark-outline" size={27} color="#FFFFFF" /></View>
            <View style={styles.dialogHeroCopy}>
              <Text style={styles.dialogHeroEyebrow}>EKİP YETKİLERİ</Text>
              <Text style={styles.dialogHeroTitle}>Görev alanlarını seçin</Text>
            </View>
          </LinearGradient>
          <View style={styles.dialogBody}>
            <Text style={styles.permissionUserName} numberOfLines={1}>{target?.fullName}</Text>
            <Text style={styles.permissionHelper}>Yalnızca seçtiğiniz alanlar yönetim panelinde görünür ve sunucu tarafından izinli olur.</Text>
            <View style={styles.permissionOptions}>
              {ADMIN_PERMISSION_OPTIONS.map((option) => {
                const selected = selectedPermissions.includes(option.key);
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.permissionOption, selected && styles.permissionOptionSelected]}
                    onPress={() => togglePermission(option.key)}
                    disabled={isSaving}
                    activeOpacity={0.74}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <GlassIconButton icon={option.icon} iconSize={18} size={40} active={selected} />
                    <View style={styles.permissionOptionCopy}>
                      <Text style={styles.permissionOptionTitle}>{option.title}</Text>
                      <Text style={styles.permissionOptionDescription}>{option.description}</Text>
                    </View>
                    <View style={[styles.permissionCheck, selected && styles.permissionCheckSelected]}>
                      {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {error ? <Text style={styles.supportDialogError}>{error}</Text> : null}
            <Text style={styles.permissionRemoveHint}>Tüm seçimleri kaldırıp kaydetmek, kullanıcıyı yönetim ekibinden çıkarır.</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogSecondaryButton} onPress={onClose} disabled={isSaving} activeOpacity={0.75}>
                <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogPrimaryButton, styles.supportCloseConfirmButton]} onPress={() => { void handleSave(); }} disabled={isSaving} activeOpacity={0.75}>
                {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="shield-checkmark-outline" size={17} color="#FFFFFF" />}
                <Text style={styles.supportCloseConfirmText}>{isSaving ? 'Kaydediliyor' : 'Yetkileri Kaydet'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
