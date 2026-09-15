import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { UserProfile } from '../../auth/domain/User';
import { useAuth, useWallet, useWalletActions } from '../../../core/state';
import { Button } from '../../../shared/components/Button';
import {
  CREDIT_PRODUCT_IDS,
  CreditPurchaseService,
  StoreCreditProduct,
} from '../application/CreditPurchaseService';

interface CreditStoreScreenProps {
  currentUser?: UserProfile | null;
  onRefreshProfile?: () => void;
  onNavigateToLaunch?: () => void;
}

interface CreditPackage {
  id: string;
  storeProductId: string;
  name: string;
  tagline: string;
  credits: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
  features: string[];
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    storeProductId: CREDIT_PRODUCT_IDS.starter,
    name: 'Başlangıç',
    tagline: 'Temel görünürlük için başlangıç paketi',
    credits: 100,
    price: 299,
    features: [
      'Sponsorlu Vitrin süresi',
      'Saatlik eşit rotasyona katılım',
      '100 görünürlük kredisi',
    ],
  },
  {
    id: 'pro_launch',
    storeProductId: CREDIT_PRODUCT_IDS.pro_launch,
    name: 'Profesyonel',
    tagline: 'Daha uzun sponsorlu görünürlük süresi',
    credits: 350,
    price: 699,
    badge: 'Önerilen paket',
    isPopular: true,
    features: [
      'Sponsorlu proje rozeti',
      'Saatlik eşit sponsor rotasyonu',
      '350 görünürlük kredisi',
    ],
  },
  {
    id: 'unicorn',
    storeProductId: CREDIT_PRODUCT_IDS.unicorn,
    name: 'Ölçek',
    tagline: 'Uzun süreli sponsorlu görünürlük',
    credits: 1000,
    price: 1699,
    badge: 'Geniş erişim',
    features: [
      'Uzun süreli sponsorlu gösterim',
      'Saatlik eşit sponsor rotasyonu',
      '1000 görünürlük kredisi',
    ],
  },
];

interface CreditBalanceCardProps {
  balance: number;
  onNavigateToLaunch?: () => void;
}

const CreditBalanceCard: React.FC<CreditBalanceCardProps> = ({
  balance,
  onNavigateToLaunch,
}) => (
  <View style={styles.balanceCard}>
    <LinearGradient
      pointerEvents="none"
      colors={['#25485c', '#EAF2FC', '#FAFBFD']}
      locations={[0, 0.46, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.balanceGradient}
    />
    <View pointerEvents="none" style={styles.balanceGlowOrb} />
    <View pointerEvents="none" style={styles.balanceSpecular} />
    <View style={styles.balanceHeader}>
      <Text style={styles.balanceEyebrow}>KULLANILABİLİR BAKİYE</Text>
      <View style={styles.flashIconPill}>
        <Ionicons name="flash" size={20} color="#25364E" />
      </View>
    </View>

    <View style={styles.balanceValueRow}>
      <Text style={styles.balanceNumber}>{balance}</Text>
      <Text style={styles.balanceUnit}>kredi</Text>
    </View>

    <Text style={styles.balanceDescription}>
      Kredilerini projelerinin görünürlüğünü artırmak için kullanabilirsin.
    </Text>

    {onNavigateToLaunch ? (
      <TouchableOpacity
        style={styles.balanceAction}
        activeOpacity={0.7}
        onPress={onNavigateToLaunch}
        accessibilityRole="button"
        accessibilityLabel="Projeyi öne çıkar"
      >
        <Text style={styles.balanceActionText}>Lansman alanına git</Text>
        <Ionicons name="arrow-forward" size={14} color="#25364E" />
      </TouchableOpacity>
    ) : null}
  </View>
);

interface BenefitItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
}

const BenefitItem: React.FC<BenefitItemProps> = ({ icon, title }) => (
  <View style={styles.benefitItem}>
    <View style={styles.benefitIconBox}>
      <Ionicons name={icon} size={15} color="#25364E" />
    </View>
    <Text style={styles.benefitTitle}>
      {title}
    </Text>
  </View>
);

interface CreditPackageCardProps {
  pkg: CreditPackage;
  priceLabel: string;
  isSelected: boolean;
  onSelect: (pkgId: string) => void;
}

const CreditPackageCard: React.FC<CreditPackageCardProps> = ({
  pkg,
  priceLabel,
  isSelected,
  onSelect,
}) => {
  const cardBorderColor = isSelected
    ? '#EAF2FC'
    : pkg.isPopular
    ? 'rgba(50,105,199,0.32)'
    : 'rgba(50,105,199,0.14)';

  const cardBgColor = isSelected
    ? 'rgba(50,105,199,0.08)'
    : '#F8F9FB';

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => onSelect(pkg.id)}
      style={[
        styles.packageCard,
        {
          borderColor: cardBorderColor,
          backgroundColor: cardBgColor,
        },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${pkg.name} paketi, ${pkg.credits} kredi, ${priceLabel}`}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          isSelected
            ? ['#FAFBFD', '#F8F9FB', '#F8F9FB']
            : pkg.isPopular
            ? ['#FAFBFD', '#F8F9FB', '#F8F9FB']
            : ['#F8F9FB', '#F8F9FB', '#F8F9FB']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.packageGradient}
      />
      <View style={styles.packageSpecular} />
      <View pointerEvents="none" style={styles.packageArt}>
        <View style={[styles.artTile, styles.artTileBack]} />
        <View style={[styles.artTile, styles.artTileFront]}>
          <Ionicons name={pkg.id === 'starter' ? 'flash-outline' : pkg.isPopular ? 'rocket-outline' : 'layers-outline'} size={30} color="#25364E" />
        </View>
      </View>
      {pkg.badge ? (
        <View
          style={[
            styles.packageBadge,
            pkg.isPopular ? styles.popularBadge : styles.neutralBadge,
          ]}
        >
          <Text
            style={[
              styles.packageBadgeText,
              pkg.isPopular ? styles.popularBadgeText : styles.neutralBadgeText,
            ]}
          >
            {pkg.badge}
          </Text>
        </View>
      ) : null}

      <View style={styles.packageCardHeader}>
        <View style={styles.packageCardTitleCol}>
          <Text style={styles.packageName}>{pkg.name}</Text>
          <Text style={styles.packageTagline}>
            {pkg.tagline}
          </Text>
        </View>

        <View style={styles.selectIndicator}>
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isSelected ? '#25364E' : '#25364E'}
          />
        </View>
      </View>

      <View style={styles.packagePriceRow}>
        <View style={styles.packageCreditsCol}>
          <Text style={styles.packageCreditsNumber}>{pkg.credits}</Text>
          <Text style={styles.packageCreditsUnit}>Kredi</Text>
        </View>
        <Text style={styles.packagePriceText}>{priceLabel}</Text>
      </View>

      <View style={styles.packageFeaturesList}>
        {pkg.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons name="checkmark" size={13} color="#25364E" style={styles.featureIcon} />
            <Text style={styles.featureText}>
              {feature}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.packageSelect, isSelected && styles.packageSelectActive]}>
        <Text style={[styles.packageSelectText, isSelected && styles.packageSelectTextActive]}>{isSelected ? 'Seçili paket' : 'Paketi seç'}</Text>
        <Ionicons name={isSelected ? 'checkmark' : 'arrow-forward'} size={16} color={isSelected ? '#25364E' : '#25364E'} />
      </View>
    </TouchableOpacity>
  );
};

interface PurchaseBarProps {
  selectedPackage: CreditPackage;
  priceLabel: string;
  statusText?: string;
  loading: boolean;
  disabled: boolean;
  onPurchase: () => void;
}

const PurchaseBar: React.FC<PurchaseBarProps> = ({
  selectedPackage,
  priceLabel,
  statusText,
  loading,
  disabled,
  onPurchase,
}) => (
  <View style={styles.purchaseBar}>
    {statusText ? (
      <View style={styles.storeStatusRow}>
        <Ionicons name="information-circle-outline" size={13} color="#686474" />
        <Text style={styles.storeStatusText}>{statusText}</Text>
      </View>
    ) : null}
    <View style={styles.purchaseInfoRow}>
      <Text style={styles.purchasePlanName} numberOfLines={1}>
        {selectedPackage.name} Paketi
      </Text>
      <Text style={styles.purchasePlanSummary}>
        {selectedPackage.credits} Kredi · {priceLabel}
      </Text>
    </View>

    <View style={styles.purchaseButtonContainer}>
      <Button
        title={`${selectedPackage.credits} Kredi Satın Al · ${priceLabel}`}
        variant="primary"
        size="lg"
        showArrow={true}
        isLoading={loading}
        disabled={disabled}
        onPress={onPurchase}
        accessibilityLabel={`${selectedPackage.credits} kredi satın al, ${priceLabel}`}
        style={{ width: '100%' }}
      />
    </View>
  </View>
);

export const CreditStoreScreen: React.FC<CreditStoreScreenProps> = ({
  currentUser: propUser,
  onRefreshProfile,
  onNavigateToLaunch,
}) => {
  const { profile: authUser } = useAuth();
  const { credits } = useWallet();
  const { refreshCredits } = useWalletActions();
  const [contentWidth, setContentWidth] = useState(0);

  const user = propUser !== undefined ? propUser : authUser;
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pro_launch');
  const [loading, setLoading] = useState(false);
  const [storeProducts, setStoreProducts] = useState<Record<string, StoreCreditProduct>>({});
  const [storeState, setStoreState] = useState<'loading' | 'ready' | 'unconfigured' | 'error'>(
    CreditPurchaseService.isConfiguredForDevice() ? 'loading' : 'unconfigured'
  );

  const activeBalance = credits ?? user?.boostCredits ?? 0;

  const selectedPackage =
    CREDIT_PACKAGES.find((pkg) => pkg.id === selectedPackageId) ||
    CREDIT_PACKAGES[1];

  useEffect(() => {
    let active = true;

    if (!user || !CreditPurchaseService.isConfiguredForDevice()) {
      setStoreState('unconfigured');
      return () => {
        active = false;
      };
    }

    setStoreState('loading');
    CreditPurchaseService.getProducts(user.id)
      .then((products) => {
        if (!active) return;
        setStoreProducts(products);
        const firstAvailablePackage = CREDIT_PACKAGES.find(
          (pkg) => products[pkg.storeProductId]
        );
        setStoreState(firstAvailablePackage ? 'ready' : 'error');
        if (firstAvailablePackage) {
          setSelectedPackageId((currentId) => {
            const currentPackage = CREDIT_PACKAGES.find((pkg) => pkg.id === currentId);
            return currentPackage && products[currentPackage.storeProductId]
              ? currentId
              : firstAvailablePackage.id;
          });
        }
      })
      .catch((error: unknown) => {
        console.warn('Kredi ürünleri mağazadan alınamadı:', error);
        if (active) setStoreState('error');
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const getPriceLabel = (pkg: CreditPackage): string =>
    storeProducts[pkg.storeProductId]?.priceString || `₺${pkg.price}`;

  const storeStatusText =
    storeState === 'loading'
      ? 'Mağaza fiyatları güvenli biçimde yükleniyor…'
      : storeState === 'unconfigured'
      ? 'Kredi satın alma şu anda kullanılamıyor.'
      : storeState === 'error'
      ? 'Paket fiyatları yüklenemedi. Lütfen daha sonra tekrar dene.'
      : undefined;

  const selectedProductAvailable = Boolean(storeProducts[selectedPackage.storeProductId]);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Kredi satın almak için lütfen giriş yapınız.');
      return;
    }

    if (storeState !== 'ready') {
      Alert.alert(
        'Mağaza Henüz Hazır Değil',
        'Apple/Google sandbox ürünleri veya RevenueCat anahtarı henüz yapılandırılmadı. Hesabından ücret alınmadı.'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await CreditPurchaseService.purchase(user.id, pkg.storeProductId);

      if (result.status === 'cancelled') return;
      if (result.status === 'pending') {
        Alert.alert('Ödeme Beklemede', 'Mağaza ödemeyi onayladığında kredilerin otomatik yüklenecek.');
        return;
      }

      let delivered = false;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, attempt === 0 ? 700 : 1000));
        const latestBalance = await refreshCredits();
        if (latestBalance >= activeBalance + pkg.credits) {
          delivered = true;
          break;
        }
      }
      onRefreshProfile?.();
      Alert.alert(
        delivered ? 'Kredilerin Hazır' : 'Satın Alma Alındı',
        delivered
          ? `${pkg.credits} kredi güvenli biçimde hesabına tanımlandı.`
          : 'Ödemen doğrulandı. Mağaza bildirimi gecikirse kredi bakiyen kısa süre içinde otomatik güncellenecek.'
      );
    } catch (error: unknown) {
      console.warn('Kredi satın alma hatası:', error);
      Alert.alert(
        'Satın Alma Tamamlanamadı',
        'Mağaza bağlantısı kurulamadı veya ürün henüz sandbox ortamında hazır değil. Hesabından doğrulanmamış bir işlem için kredi eklenmedi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.rootContainer} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        style={styles.scrollArea}
        decelerationRate={0.99}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <KistasTopBrandBar />

        {/* 1. ÜST BAŞLIK */}
        <View style={[styles.hero, contentWidth >= 850 && styles.heroWide]}>
        <View style={styles.header}>
          <Text style={styles.heroEyebrow}>KISTAS KREDİ MAĞAZASI</Text>
          <Text style={styles.pageTitle}>{'İyi bir proje.\nDaha fazla keşif.'}</Text>
          <Text style={styles.pageSubtitle}>
            Projene sahnede yer aç. Görünürlük kredilerinle Sponsorlu Vitrin süreni kendin belirle.
          </Text>
        </View>

        {/* 2. BAKİYE KARTI */}
        <CreditBalanceCard
          balance={activeBalance}
          onNavigateToLaunch={onNavigateToLaunch}
        />
        </View>

        {/* 3. KISA BİLGİ ALANI */}
        <View style={styles.benefitsContainer}>
          <BenefitItem icon="eye-outline" title="Vitrinde görünürlük" />
          <BenefitItem icon="layers-outline" title="Saatlik eşit rotasyon" />
          <BenefitItem icon="ribbon-outline" title="Sponsorlu rozet" />
        </View>

        {/* 4. KREDİ PAKETLERİ */}
        <View style={styles.packagesSection}>
          <Text style={styles.sectionEyebrow}>BİR SONRAKİ ADIMIN</Text>
          <Text style={styles.sectionHeader}>Hedefine uygun paketi seç.</Text>
          <Text style={styles.sectionDescription}>Aynı vitrin, farklı kredi seçenekleri. Kontrol sende.</Text>
          <View style={[styles.packagesGrid, contentWidth >= 850 && styles.packagesGridWide]}>
          {CREDIT_PACKAGES.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              pkg={pkg}
              priceLabel={getPriceLabel(pkg)}
              isSelected={selectedPackageId === pkg.id}
              onSelect={(id) => setSelectedPackageId(id)}
            />
          ))}
          </View>
        </View>

        {/* 6. ŞEFFAFLIK NOTU */}
        <View style={styles.transparencyRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color="#686474"
            style={styles.transparencyIcon}
          />
          <Text style={styles.transparencyText}>
            Krediler yalnızca Kıstas içindeki proje görünürlüğü için kullanılır.
          </Text>
        </View>
      {/* Seçim özeti, mobil navbarın üstünde kaydırılarak erişilir. */}
      <PurchaseBar
        selectedPackage={selectedPackage}
        priceLabel={getPriceLabel(selectedPackage)}
        statusText={storeStatusText}
        loading={loading}
        disabled={storeState !== 'ready' || !selectedProductAvailable}
        onPurchase={() => handlePurchase(selectedPackage)}
      />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 136,
  },
  hero: { gap: 24, marginBottom: 24 },
  heroWide: { flexDirection: 'row', alignItems: 'stretch', gap: 40 },
  heroEyebrow: { fontSize: 10, letterSpacing: 1.7, fontWeight: '700', color: '#686474', marginTop: 24 },
  sectionEyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', color: '#686474', marginBottom: 8 },
  sectionDescription: { fontSize: 14, lineHeight: 21, color: '#686474', marginBottom: 22 },
  packagesGrid: { gap: 16 },
  packagesGridWide: { flexDirection: 'row', alignItems: 'stretch' },
  packageArt: { height: 88, marginBottom: 20, justifyContent: 'center' },
  artTile: { position: 'absolute', width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  artTileBack: { left: 17, top: 11, backgroundColor: '#FAFBFD', transform: [{ rotate: '16deg' }] },
  artTileFront: { left: 0, top: 19, backgroundColor: '#25485c', borderWidth: 1, borderColor: '#3269C7', transform: [{ rotate: '-9deg' }], ...Platform.select({ web: { boxShadow: '0 8px 12px rgba(255,255,255,0.13), inset 0 2px 1px rgba(255,255,255,0.2)' }, default: { elevation: 2 } }) },
  packageSelect: { marginTop: 24, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FB' },
  packageSelectActive: { backgroundColor: '#EAF2FC' },
  packageSelectText: { fontSize: 13, fontWeight: '700', color: '#25364E' },
  packageSelectTextActive: { color: '#25364E' },
  header: {
    flex: 1,
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '700',
    color: '#25364E',
    marginTop: 12,
    letterSpacing: -1.3,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#686474',
    marginTop: 8,
    lineHeight: 23,
    maxWidth: 420,
  },
  balanceCard: {
    flex: 1,
    minHeight: 256,
    backgroundColor: '#EAF2FC',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    padding: 26,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  balanceGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
  },
  balanceGlowOrb: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: 65,
    right: -100,
    borderWidth: 34,
    borderColor: 'rgba(50,105,199,0.035)',
    backgroundColor: 'rgba(37,35,51,0.035)',
  },
  balanceSpecular: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.22)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: '#25364E',
    letterSpacing: 0.8,
  },
  flashIconPill: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(37,35,51,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  balanceNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: -0.5,
  },
  balanceUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25364E',
    marginLeft: 6,
  },
  balanceDescription: {
    fontSize: 12.5,
    color: '#25364E',
    lineHeight: 18,
    marginBottom: 12,
  },
  balanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    minHeight: 44,
  },
  balanceActionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#25364E',
    marginRight: 4,
  },
  benefitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 36,
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitItem: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(50,105,199,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  benefitTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#25364E',
  },
  packagesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 25,
    fontWeight: '700',
    color: '#25364E',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  packageCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  packageGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
  },
  packageSpecular: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.15)',
  },
  packageBadge: {
    position: 'absolute',
    top: 20,
    right: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularBadge: {
    backgroundColor: '#EAF2FC',
  },
  neutralBadge: {
    backgroundColor: 'rgba(50,105,199,0.18)',
  },
  packageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  popularBadgeText: {
    color: '#25364E',
  },
  neutralBadgeText: {
    color: '#25364E',
  },
  packageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageCardTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  packageName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#25364E',
  },
  packageTagline: {
    fontSize: 12,
    color: '#686474',
    marginTop: 6,
    lineHeight: 19,
    minHeight: 38,
  },
  selectIndicator: {
    marginLeft: 4,
  },
  packagePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50,105,199,0.08)',
    marginBottom: 10,
  },
  packageCreditsCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packageCreditsNumber: {
    fontSize: 36,
    letterSpacing: -1,
    fontWeight: '700',
    color: '#25364E',
  },
  packageCreditsUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25364E',
    marginLeft: 5,
  },
  packagePriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#25364E',
  },
  packageFeaturesList: {
    gap: 10,
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 6,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    color: '#25364E',
    lineHeight: 16,
  },
  transparencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  transparencyIcon: {
    marginRight: 6,
  },
  transparencyText: {
    flexShrink: 1,
    fontSize: 11.5,
    color: '#686474',
    textAlign: 'center',
  },
  purchaseBar: {
    borderRadius: 24,
    backgroundColor: 'rgba(250,251,253,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.08)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  storeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 8,
  },
  storeStatusText: {
    flexShrink: 1,
    color: '#686474',
    fontSize: 10.5,
    fontWeight: '600',
  },
  purchaseInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  purchaseButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  purchasePlanName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#686474',
  },
  purchasePlanSummary: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#25364E',
  },
  purchaseButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  purchaseGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
  },
  purchaseSpecular: {
    position: 'absolute',
    top: 2,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.32)',
  },
  purchaseButtonDisabled: {
    opacity: 0.65,
  },
  purchaseButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: 0.2,
  },
});
