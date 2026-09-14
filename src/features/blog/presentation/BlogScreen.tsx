import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlogPost, BLOG_CATEGORIES } from '../domain/BlogPost';
import { BlogService } from '../application/BlogService';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';

export interface BlogScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onCreateProject?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  initialPostSlug?: string | null;
  onPostChange?: (slug: string | null) => void;
}

export const BlogScreen: React.FC<BlogScreenProps> = ({
  onBack,
  onExplore,
  onCreateProject,
  initialPostSlug,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    BlogService.getPublishedPosts(selectedCategory)
      .then((data) => {
        if (isMounted) {
          setPosts(data);
          if (initialPostSlug) {
            const found = data.find((p) => p.slug === initialPostSlug);
            if (found) setSelectedPost(found);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, initialPostSlug]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(dateStr));
    } catch {
      return 'Yakın zamanda';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {selectedPost ? (
        /* Detay Görünümü */
        <View style={styles.detailWrap}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedPost(null)}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={17} color="#526680" />
            <Text style={styles.backButtonText}>Yazılara Dön</Text>
          </TouchableOpacity>

          <View style={styles.badgeRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{selectedPost.category}</Text>
            </View>
            <Text style={styles.metaText}>{selectedPost.reading_time_minutes} dk okuma</Text>
          </View>

          <Text style={styles.detailTitle}>{selectedPost.title}</Text>
          <Text style={styles.detailLead}>{selectedPost.excerpt}</Text>

          <Image
            source={{ uri: selectedPost.cover_image_url }}
            style={styles.detailCover}
            resizeMode="cover"
          />

          <View style={styles.authorRow}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>
                {selectedPost.author_name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{selectedPost.author_name}</Text>
              <Text style={styles.authorTitle}>{selectedPost.author_title}</Text>
            </View>
          </View>

          <Text style={styles.detailBody}>{selectedPost.content}</Text>

          <TouchableOpacity
            style={styles.ctaBox}
            onPress={onCreateProject || onExplore}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaTitle}>Kendi Projeni Tanıt</Text>
            <Text style={styles.ctaSubtitle}>Kıstas vitrininde 2 dakikada lansmanını yap.</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Liste Görünümü */
        <View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={17} color="#526680" />
            <Text style={styles.backButtonText}>Vitrine Dön</Text>
          </TouchableOpacity>

          <KistasTopBrandBar onPress={onBack} />
          <Text style={styles.kicker}>PERSPEKTİF & EDİTORYAL</Text>
          <Text style={styles.title}>Kıstas Blog</Text>
          <Text style={styles.lead}>
            Bağımsız geliştiricilik, yapay zekâ trendleri ve organik büyüme rehberleri.
          </Text>

          {/* Arama */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#71849F" />
            <TextInput
              style={styles.searchInput}
              placeholder="Yazı veya kategori ara…"
              placeholderTextColor="#8A9BB2"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Kategoriler */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {BLOG_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isLoading ? (
            <ActivityIndicator size="small" color="#3269C7" style={{ marginTop: 32 }} />
          ) : (
            <View style={styles.postsList}>
              {filteredPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.card}
                  onPress={() => setSelectedPost(post)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: post.cover_image_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cardBody}>
                    <View style={styles.cardBadgeRow}>
                      <Text style={styles.cardCategory}>{post.category}</Text>
                      <Text style={styles.cardTime}>{post.reading_time_minutes} dk</Text>
                    </View>
                    <Text style={styles.cardTitle}>{post.title}</Text>
                    <Text style={styles.cardExcerpt} numberOfLines={2}>
                      {post.excerpt}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardAuthor}>{post.author_name}</Text>
                      <Text style={styles.cardDate}>{formatDate(post.published_at)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5FA' },
  content: { padding: 20, paddingBottom: 60 },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
    marginBottom: 20,
  },
  backButtonText: { color: '#526680', fontSize: 12, fontWeight: '700' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  kicker: { color: '#3269C7', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 32, fontWeight: '900', color: '#252333' },
  lead: { fontSize: 14, color: '#55657A', lineHeight: 21, marginTop: 8, marginBottom: 18 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#CBD9EC',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: '#252333', fontSize: 13 },
  categoryScroll: { marginBottom: 20 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F0F4FA',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#252333' },
  categoryChipText: { color: '#55667E', fontSize: 12, fontWeight: '700' },
  categoryChipTextActive: { color: '#FFFFFF' },
  postsList: { gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5F1',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1F3E69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 160, backgroundColor: '#EAF1FA' },
  cardBody: { padding: 16 },
  cardBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardCategory: { color: '#3269C7', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  cardTime: { color: '#71849F', fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#252333', lineHeight: 22, marginBottom: 6 },
  cardExcerpt: { fontSize: 13, color: '#5E6E85', lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EFF3F9', paddingTop: 10 },
  cardAuthor: { fontSize: 11.5, color: '#252333', fontWeight: '700' },
  cardDate: { fontSize: 11.5, color: '#71849F' },
  detailWrap: { paddingBottom: 40 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  categoryPill: { backgroundColor: '#EDF4FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryPillText: { color: '#3269C7', fontSize: 11, fontWeight: '800' },
  metaText: { color: '#71849F', fontSize: 12, fontWeight: '600' },
  detailTitle: { fontSize: 26, fontWeight: '900', color: '#252333', lineHeight: 32, marginBottom: 10 },
  detailLead: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 16 },
  detailCover: { width: '100%', height: 200, borderRadius: 12, marginBottom: 18, backgroundColor: '#EAF1FA' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  avatarMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDF4FD', alignItems: 'center', justifyContent: 'center' },
  avatarMiniText: { color: '#3269C7', fontWeight: '800', fontSize: 12 },
  authorName: { color: '#252333', fontSize: 13, fontWeight: '700' },
  authorTitle: { color: '#71849F', fontSize: 11 },
  detailBody: { fontSize: 15, color: '#2F3D4E', lineHeight: 25, marginBottom: 30 },
  ctaBox: { backgroundColor: '#252333', padding: 22, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  ctaTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  ctaSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});
