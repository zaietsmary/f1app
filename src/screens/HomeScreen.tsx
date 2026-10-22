import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { F1Session, RootStackParamList } from '../types';
import { getSessions } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type SessionFilter = 'race' | 'qualifying' | 'all';
type StatusFilter = 'all' | 'completed' | 'upcoming';
type SortOrder = 'asc' | 'desc';

const AVAILABLE_YEARS = [2026, 2024, 2023];

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [sessions, setSessions] = useState<F1Session[]>([]);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('race');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (year: number, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getSessions(year);
      setSessions(data);
    } catch (err: any) {
      setError(err?.message || `Не вдалося завантажити сесії F1 за ${year} рік`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions(selectedYear);
  }, [loadSessions, selectedYear]);

  // Фільтрація та сортування сесій за календарем та статусом
  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    const now = Date.now();

    // Фільтр за типом сесії
    if (sessionFilter === 'race') {
      result = result.filter((s) => s.session_name.toLowerCase().includes('race'));
    } else if (sessionFilter === 'qualifying') {
      result = result.filter((s) => s.session_name.toLowerCase().includes('qualifying'));
    }

    // Фільтр за завершеністю (минулі чи майбутні)
    if (statusFilter === 'completed') {
      result = result.filter((s) => new Date(s.date_start).getTime() <= now);
    } else if (statusFilter === 'upcoming') {
      result = result.filter((s) => new Date(s.date_start).getTime() > now);
    }

    if (sortOrder === 'desc') {
      result.reverse();
    }

    return result;
  }, [sessions, sessionFilter, statusFilter, sortOrder]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderSessionItem = ({ item, index }: { item: F1Session; index: number }) => {
    const isRace = item.session_name.toLowerCase().includes('race');
    const isQuali = item.session_name.toLowerCase().includes('qualifying');
    const isUpcoming = new Date(item.date_start).getTime() > Date.now();
    const roundNumber = sortOrder === 'asc' ? index + 1 : filteredSessions.length - index;

    return (
      <TouchableOpacity
        style={[styles.card, isUpcoming && styles.cardUpcoming]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('SessionDetails', { session: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.roundTag}>
            <Text style={styles.roundText}>Етап {roundNumber}</Text>
          </View>

          <View style={styles.badgesRow}>
            {/* Статус: Майбутній чи Завершений */}
            <View
              style={[
                styles.statusBadge,
                isUpcoming ? styles.upcomingBadge : styles.completedBadge,
              ]}
            >
              <Text
                style={isUpcoming ? styles.upcomingBadgeText : styles.completedBadgeText}
              >
                {isUpcoming ? '⏳ Майбутній' : '🏁 Завершено'}
              </Text>
            </View>

            {/* Тип сесії */}
            <View
              style={[
                styles.badge,
                isRace ? styles.raceBadge : isQuali ? styles.qualiBadge : styles.genericBadge,
              ]}
            >
              <Text style={styles.badgeText}>{item.session_name}</Text>
            </View>
          </View>
        </View>

        {/* Назва Гран-прі */}
        <Text style={styles.gpTitle}>
          {item.grand_prix_name || `${item.country_name} Grand Prix`}
        </Text>

        {/* Траса та країна */}
        <Text style={styles.circuitText}>
          {item.circuit_short_name || item.location} • {item.country_name}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>📅 {formatDate(item.date_start)}</Text>
          <Text style={[styles.arrowText, isUpcoming && styles.arrowUpcoming]}>
            {isUpcoming ? 'Інформація >' : 'Результати >'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        {/* Заголовок додатку */}
        <View style={styles.titleRow}>
          <View style={styles.f1LogoMark}>
            <Text style={styles.f1LogoText}>F1</Text>
          </View>
          <Text style={styles.headerTitle}>Календар Сезону</Text>
        </View>

        {/* Перемикач років / сезонів */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearSelector}
        >
          {AVAILABLE_YEARS.map((year) => {
            const isSelected = year === selectedYear;
            const isCurrent = year === 2026;
            return (
              <TouchableOpacity
                key={year}
                style={[styles.yearChip, isSelected && styles.yearChipSelected]}
                onPress={() => setSelectedYear(year)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.yearChipText, isSelected && styles.yearChipTextSelected]}
                >
                  {year} {isCurrent ? '• Поточний' : 'Сезон'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Рядок 1: Типи заїздів (Гонки / Кваліфікації / Всі) */}
        <View style={styles.filtersRow}>
          <View style={styles.sessionTypeTabs}>
            <TouchableOpacity
              style={[styles.tab, sessionFilter === 'race' && styles.tabActive]}
              onPress={() => setSessionFilter('race')}
            >
              <Text style={[styles.tabText, sessionFilter === 'race' && styles.tabTextActive]}>
                Гонки
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, sessionFilter === 'qualifying' && styles.tabActive]}
              onPress={() => setSessionFilter('qualifying')}
            >
              <Text style={[styles.tabText, sessionFilter === 'qualifying' && styles.tabTextActive]}>
                Кваліфікації
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, sessionFilter === 'all' && styles.tabActive]}
              onPress={() => setSessionFilter('all')}
            >
              <Text style={[styles.tabText, sessionFilter === 'all' && styles.tabTextActive]}>
                Всі
              </Text>
            </TouchableOpacity>
          </View>

          {/* Кнопка зміни порядку дат (Раунд 1 -> 24 чи навпаки) */}
          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <Text style={styles.orderButtonText}>
              {sortOrder === 'asc' ? '1 → 24' : '24 → 1'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Рядок 2: Статус (Всі / 🏁 Завершені / ⏳ Майбутні) */}
        <View style={styles.statusTabsRow}>
          <TouchableOpacity
            style={[styles.statusTab, statusFilter === 'all' && styles.statusTabActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.statusTabText, statusFilter === 'all' && styles.statusTabTextActive]}>
              Всі етапи ({sessions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTab, statusFilter === 'completed' && styles.statusTabActive]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text style={[styles.statusTabText, statusFilter === 'completed' && styles.statusTabTextActive]}>
              🏁 Завершені
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTab, statusFilter === 'upcoming' && styles.statusTabActive]}
            onPress={() => setStatusFilter('upcoming')}
          >
            <Text style={[styles.statusTabText, statusFilter === 'upcoming' && styles.statusTabTextActive]}>
              ⏳ Майбутні
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E10600" />
          <Text style={styles.loadingText}>Завантаження календаря {selectedYear} року...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadSessions(selectedYear)}
          >
            <Text style={styles.retryButtonText}>Повторити спробу</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.session_key.toString()}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadSessions(selectedYear, true)}
              tintColor="#E10600"
              colors={['#E10600']}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Етапів за обраним фільтром не знайдено</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#20202A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  f1LogoMark: {
    backgroundColor: '#E10600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  f1LogoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    fontStyle: 'italic',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  yearSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1C1C26',
    borderWidth: 1,
    borderColor: '#2A2A38',
  },
  yearChipSelected: {
    backgroundColor: '#E10600',
    borderColor: '#E10600',
  },
  yearChipText: {
    color: '#8E8E9F',
    fontSize: 13,
    fontWeight: '700',
  },
  yearChipTextSelected: {
    color: '#FFFFFF',
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sessionTypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1C1C26',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#2E2E3E',
  },
  tabText: {
    color: '#8E8E9F',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  orderButton: {
    backgroundColor: '#1C1C26',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A38',
  },
  orderButtonText: {
    color: '#E10600',
    fontSize: 12,
    fontWeight: '800',
  },
  statusTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#161622',
  },
  statusTabActive: {
    backgroundColor: '#2A2A3C',
  },
  statusTabText: {
    color: '#7E7E90',
    fontSize: 11,
    fontWeight: '700',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1A1A24',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#272736',
  },
  cardUpcoming: {
    borderColor: '#38384A',
    backgroundColor: '#161620',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roundTag: {
    backgroundColor: 'rgba(225, 6, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roundText: {
    color: '#E10600',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  completedBadgeText: {
    color: '#2ECC71',
    fontSize: 10,
    fontWeight: '800',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(241, 196, 15, 0.15)',
  },
  upcomingBadgeText: {
    color: '#F1C40F',
    fontSize: 10,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  raceBadge: {
    backgroundColor: '#E10600',
  },
  qualiBadge: {
    backgroundColor: '#383850',
  },
  genericBadge: {
    backgroundColor: '#272738',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  gpTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  circuitText: {
    color: '#9E9EA8',
    fontSize: 13,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#252533',
    paddingTop: 10,
  },
  dateText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  arrowText: {
    color: '#E10600',
    fontWeight: '800',
    fontSize: 13,
  },
  arrowUpcoming: {
    color: '#F1C40F',
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
  },
});
