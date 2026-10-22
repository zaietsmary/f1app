import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { F1Driver, RootStackParamList } from '../types';
import { getDriversBySession, normalizeHexColor } from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'SessionDetails'>;
type SortMode = 'position' | 'number' | 'name' | 'team';

export default function SessionDetailsScreen() {
  const route = useRoute<RouteProps>();
  const { session } = route.params;
  const isUpcoming = new Date(session.date_start).getTime() > Date.now();

  const [drivers, setDrivers] = useState<F1Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Перевірка: чи є реальні результати позицій (тільки для завершених гонок)
  const hasPositions = useMemo(() => {
    return !isUpcoming && drivers.some((d) => d.position != null);
  }, [isUpcoming, drivers]);

  const [sortMode, setSortMode] = useState<SortMode>(isUpcoming ? 'number' : 'position');

  useEffect(() => {
    if (isUpcoming || !hasPositions) {
      setSortMode('number');
    } else {
      setSortMode('position');
    }
  }, [isUpcoming, hasPositions]);

  const loadDrivers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getDriversBySession(session.session_key);
      setDrivers(data);
    } catch (err: any) {
      setError(err?.message || 'Не вдалося завантажити пілотів сесії');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.session_key]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Сортування пілотів
  const sortedDrivers = useMemo(() => {
    const list = [...drivers];
    if (sortMode === 'position' && hasPositions) {
      return list.sort((a, b) => {
        const posA = a.position ?? 999;
        const posB = b.position ?? 999;
        if (posA !== posB) return posA - posB;
        return a.driver_number - b.driver_number;
      });
    } else if (sortMode === 'number') {
      return list.sort((a, b) => a.driver_number - b.driver_number);
    } else if (sortMode === 'name') {
      return list.sort((a, b) => {
        const nameA = a.full_name || a.broadcast_name || '';
        const nameB = b.full_name || b.broadcast_name || '';
        return nameA.localeCompare(nameB);
      });
    } else if (sortMode === 'team') {
      return list.sort((a, b) => a.team_name.localeCompare(b.team_name));
    }
    return list;
  }, [drivers, sortMode, hasPositions]);

  const getPositionBadgeStyle = (pos: number | null | undefined) => {
    if (pos === 1) return styles.posGold;
    if (pos === 2) return styles.posSilver;
    if (pos === 3) return styles.posBronze;
    return styles.posDefault;
  };

  const renderDriverCard = ({ item }: { item: F1Driver }) => {
    const teamColor = normalizeHexColor(item.team_colour);
    const pos = item.position;

    return (
      <View style={styles.driverCard}>
        {/* Кольорова смуга команди */}
        <View style={[styles.teamColorBar, { backgroundColor: teamColor }]} />

        {/* Бейдж позиції (P1, P2, P3...) показуємо ТІЛЬКИ якщо гонка вже відбулася! */}
        {hasPositions && pos != null && (
          <View style={[styles.posBadge, getPositionBadgeStyle(pos)]}>
            <Text
              style={[
                styles.posText,
                pos <= 3 ? styles.posTextPodium : null,
              ]}
            >
              P{pos}
            </Text>
          </View>
        )}

        {/* Стартовий номер боліда */}
        <View style={[styles.numberBadge, !hasPositions && styles.numberBadgeLarge]}>
          <Text style={styles.numberHash}>#</Text>
          <Text style={[styles.numberText, !hasPositions && styles.numberTextLarge]}>
            {item.driver_number}
          </Text>
        </View>

        {/* Аватар / Фото пілота */}
        <View style={styles.avatarContainer}>
          {item.headshot_url ? (
            <Image
              source={{ uri: item.headshot_url }}
              style={styles.avatar}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>{item.name_acronym || 'F1'}</Text>
            </View>
          )}
        </View>

        {/* Інформація про пілота */}
        <View style={styles.driverInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.driverFullName} numberOfLines={1}>
              {item.full_name || item.broadcast_name}
            </Text>
            <View style={styles.acronymBadge}>
              <Text style={styles.acronymText}>{item.name_acronym}</Text>
            </View>
          </View>

          <View style={styles.teamRow}>
            <View style={[styles.teamDot, { backgroundColor: teamColor }]} />
            <Text style={styles.teamName} numberOfLines={1}>
              {item.team_name}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Шапка сесії */}
      <View style={styles.sessionBanner}>
        <View style={styles.bannerRow}>
          <Text style={styles.bannerCountry}>{session.country_name.toUpperCase()} • {session.year}</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.statusTag, isUpcoming ? styles.statusUpcoming : styles.statusCompleted]}>
              <Text style={isUpcoming ? styles.statusUpcomingText : styles.statusCompletedText}>
                {isUpcoming ? '⏳ Майбутній етап' : '🏁 Завершено'}
              </Text>
            </View>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>{session.session_name}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.bannerCircuit}>
          {session.grand_prix_name || `${session.country_name} Grand Prix`}
        </Text>
        <Text style={styles.bannerLocation}>
          📍 {session.circuit_short_name || session.location} • 📅 {new Date(session.date_start).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>

        {isUpcoming && (
          <View style={styles.upcomingNoticeBox}>
            <Text style={styles.upcomingNoticeTitle}>🗓️ Цей етап ще не відбувся</Text>
            <Text style={styles.upcomingNoticeDesc}>
              Заїзд заплановано на {new Date(session.date_start).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}. Позиції на фініші та класифікація P1–P20 з'являться після фінішу гонки.
            </Text>
          </View>
        )}
      </View>

      {/* Панель сортування та заголовок */}
      <View style={styles.controlsHeader}>
        <Text style={styles.sectionTitle}>
          {hasPositions ? `Класифікація (${drivers.length})` : `Склад пілотів (${drivers.length})`}
        </Text>

        <View style={styles.sortButtonsRow}>
          {hasPositions && (
            <TouchableOpacity
              style={[styles.sortButton, sortMode === 'position' && styles.sortButtonActive]}
              onPress={() => setSortMode('position')}
            >
              <Text
                style={[styles.sortButtonText, sortMode === 'position' && styles.sortButtonTextActive]}
              >
                Позиція P1
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.sortButton, sortMode === 'number' && styles.sortButtonActive]}
            onPress={() => setSortMode('number')}
          >
            <Text
              style={[styles.sortButtonText, sortMode === 'number' && styles.sortButtonTextActive]}
            >
              № Номер
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortMode === 'name' && styles.sortButtonActive]}
            onPress={() => setSortMode('name')}
          >
            <Text
              style={[styles.sortButtonText, sortMode === 'name' && styles.sortButtonTextActive]}
            >
              Ім'я
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortMode === 'team' && styles.sortButtonActive]}
            onPress={() => setSortMode('team')}
          >
            <Text
              style={[styles.sortButtonText, sortMode === 'team' && styles.sortButtonTextActive]}
            >
              Команда
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E10600" />
          <Text style={styles.loadingText}>
            {isUpcoming ? 'Завантаження складу пілотів...' : 'Завантаження пілотів та позицій...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDrivers()}>
            <Text style={styles.retryButtonText}>Повторити спробу</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedDrivers}
          keyExtractor={(item) => `${item.driver_number}_${item.session_key}`}
          renderItem={renderDriverCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDrivers(true)}
              tintColor="#E10600"
              colors={['#E10600']}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {isUpcoming
                  ? 'Склад пілотів для цієї майбутньої сесії ще оновлюється в OpenF1'
                  : 'Даних про пілотів для цієї сесії немає'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121216',
  },
  sessionBanner: {
    backgroundColor: '#181822',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262636',
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerCountry: {
    color: '#E10600',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusUpcoming: {
    backgroundColor: 'rgba(241, 196, 15, 0.2)',
  },
  statusUpcomingText: {
    color: '#F1C40F',
    fontSize: 11,
    fontWeight: '800',
  },
  statusCompleted: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  statusCompletedText: {
    color: '#2ECC71',
    fontSize: 11,
    fontWeight: '800',
  },
  bannerBadge: {
    backgroundColor: '#272738',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bannerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  upcomingNoticeBox: {
    backgroundColor: '#232014',
    borderWidth: 1,
    borderColor: '#735B10',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  upcomingNoticeTitle: {
    color: '#F1C40F',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  upcomingNoticeDesc: {
    color: '#D4C9A0',
    fontSize: 12,
    lineHeight: 18,
  },
  bannerCircuit: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerLocation: {
    color: '#8E8E9F',
    fontSize: 12,
  },
  controlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sortButtonsRow: {
    flexDirection: 'row',
    backgroundColor: '#1C1C28',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  sortButton: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sortButtonActive: {
    backgroundColor: '#E10600',
  },
  sortButtonText: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '700',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  driverCard: {
    backgroundColor: '#1B1B24',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A38',
  },
  teamColorBar: {
    width: 5,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  posBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 8,
  },
  posGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderColor: '#FFD700',
    borderWidth: 1.5,
  },
  posSilver: {
    backgroundColor: 'rgba(192, 192, 192, 0.25)',
    borderColor: '#E0E0E0',
    borderWidth: 1.5,
  },
  posBronze: {
    backgroundColor: 'rgba(205, 127, 50, 0.25)',
    borderColor: '#CD7F32',
    borderWidth: 1.5,
  },
  posDefault: {
    backgroundColor: '#262638',
  },
  posText: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '900',
  },
  posTextPodium: {
    color: '#FFFFFF',
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#21212E',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2C2C3E',
  },
  numberBadgeLarge: {
    width: 44,
    height: 44,
    marginLeft: 4,
    marginRight: 12,
  },
  numberHash: {
    color: '#E10600',
    fontSize: 10,
    fontWeight: '900',
  },
  numberText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  numberTextLarge: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#242434',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#8E8E9F',
    fontSize: 12,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  driverFullName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  acronymBadge: {
    backgroundColor: '#282838',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  acronymText: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '800',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  teamName: {
    color: '#8E8E9F',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#8E8E9F',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#E10600',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    color: '#8E8E9F',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
