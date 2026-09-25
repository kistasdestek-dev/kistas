import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Conversation } from '../../../chat/domain/Chat';
import { ChatService } from '../../../chat/application/ChatService';
import { styles } from '../AdminDashboardScreen.styles';

export interface AdminSupportModalsProps {
  closeTarget: Conversation | null;
  clearTarget: Conversation | null;
  onCancelClose: () => void;
  onCancelClear: () => void;
  onSuccess: (message: string, icon: React.ComponentProps<typeof Ionicons>['name']) => void;
}

export const AdminSupportModals: React.FC<AdminSupportModalsProps> = ({
  closeTarget,
  clearTarget,
  onCancelClose,
  onCancelClear,
  onSuccess,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const confirmClose = async () => {
    if (!closeTarget || isClosing) return;
    setIsClosing(true);
    setCloseError(null);
    const result = await ChatService.closeSupportConversation(closeTarget.id);
    setIsClosing(false);
    if (!result.success) {
      setCloseError(result.error || 'Görüşme sonlandırılamadı.');
      return;
    }
    onCancelClose();
    onSuccess('Destek görüşmesi sonlandırıldı ve arşivlendi.', 'checkmark-done-outline');
  };

  const confirmClear = async () => {
    if (!clearTarget || isClearing) return;
    setIsClearing(true);
    setClearError(null);
    const result = await ChatService.clearSupportMessages(clearTarget.id);
    setIsClearing(false);
    if (!result.success) {
      setClearError(result.error || 'Mesaj geçmişi temizlenemedi.');
      return;
    }
    onCancelClear();
    onSuccess(`${result.deletedCount || 0} mesaj kalıcı olarak silindi.`, 'trash-outline');
  };

  return (
    <>
      {/* Destek Görüşmesini Sonlandır Modalı */}
      <Modal
        visible={Boolean(closeTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isClosing && onCancelClose()}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#173B72', '#3269C7', '#4F87DF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}><Ionicons name="checkmark-done-outline" size={27} color="#FFFFFF" /></View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>CANLI DESTEK</Text>
                <Text style={styles.dialogHeroTitle}>Sohbeti sonlandır?</Text>
              </View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <Text style={styles.supportDialogParty} numberOfLines={1}>{closeTarget?.otherParty?.fullName || 'Kıstas Üyesi'}</Text>
              <Text style={styles.supportDialogMessage}>Görüşme arşivlenecek ve kullanıcı bu talebe artık mesaj gönderemeyecek. Yeni talebi ayrı bir görüşme olarak açılacaktır.</Text>
              {closeError ? <Text style={styles.supportDialogError}>{closeError}</Text> : null}
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={onCancelClose} disabled={isClosing} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.supportCloseConfirmButton]} onPress={() => { void confirmClose(); }} disabled={isClosing} activeOpacity={0.75}>
                  {isClosing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-done-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.supportCloseConfirmText}>{isClosing ? 'Sonlandırılıyor' : 'Sohbeti Sonlandır'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Destek Mesajlarını Sil Modalı */}
      <Modal
        visible={Boolean(clearTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isClearing && onCancelClear()}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#70263A', '#A9334E', '#C75770']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}><Ionicons name="trash-outline" size={27} color="#FFFFFF" /></View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>DESTEK ARŞİVİ</Text>
                <Text style={styles.dialogHeroTitle}>Mesajları sil?</Text>
              </View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <Text style={styles.supportDialogParty} numberOfLines={1}>{clearTarget?.otherParty?.fullName || 'Kıstas Üyesi'}</Text>
              <Text style={styles.supportDialogMessage}>Bu görüşmedeki tüm mesajlar kalıcı olarak silinecek. Sonlandırılan görüşme kaydı destek taleplerinde görünmeye devam edecektir.</Text>
              {clearError ? <Text style={styles.supportDialogError}>{clearError}</Text> : null}
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={onCancelClear} disabled={isClearing} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.dialogDeleteButton]} onPress={() => { void confirmClear(); }} disabled={isClearing} activeOpacity={0.75}>
                  {isClearing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="trash-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.dialogDeleteText}>{isClearing ? 'Siliniyor' : 'Mesajları Sil'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
