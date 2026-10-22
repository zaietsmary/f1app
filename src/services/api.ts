import { F1Driver, F1Session } from '../types';

const BASE_URL = 'https://api.openf1.org/v1';

async function fetchWithRetry(url: string, retries = 2, delayMs = 400): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url);
    if (res.status === 429 && i < retries) {
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      continue;
    }
    return res;
  }
  return fetch(url);
}

/**
 * Отримує повний календар сесій за сезон із реальними назвами Гран-прі.
 * Сортується хронологічно від Раунду 1 (початок сезону) до фінального етапу.
 */
export async function getSessions(year: number = 2024): Promise<F1Session[]> {
  try {
    const [sessionsRes, meetingsRes] = await Promise.all([
      fetchWithRetry(`${BASE_URL}/sessions?year=${year}`),
      fetchWithRetry(`${BASE_URL}/meetings?year=${year}`),
    ]);

    if (!sessionsRes.ok) {
      throw new Error(`Помилка запиту сесій: ${sessionsRes.status}`);
    }

    const sessionsData: F1Session[] = await sessionsRes.json();
    let meetingMap = new Map<number, string>();

    if (meetingsRes.ok) {
      try {
        const meetingsData: Array<{ meeting_key: number; meeting_name: string }> =
          await meetingsRes.json();
        meetingsData.forEach((m) => meetingMap.set(m.meeting_key, m.meeting_name));
      } catch (e) {
        console.warn('Не вдалося завантажити назви Гран-прі:', e);
      }
    }

    // Прикріплюємо справжні офіційні назви Гран-прі
    const enrichedSessions: F1Session[] = sessionsData.map((s) => {
      const gpName =
        (s.meeting_key ? meetingMap.get(s.meeting_key) : null) ||
        `${s.country_name} Grand Prix`;

      return {
        ...s,
        grand_prix_name: gpName,
      };
    });

    // Хронологічний порядок сезону: від першого етапу (березень) до останнього (грудень)
    return enrichedSessions.sort(
      (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
    );
  } catch (error) {
    console.error('API getSessions error:', error);
    throw error;
  }
}

/**
 * Отримує пілотів та їхні фінішні або поточні позиції у сесії (P1, P2... P20).
 */
export async function getDriversBySession(sessionKey: number): Promise<F1Driver[]> {
  try {
    const driversRes = await fetchWithRetry(`${BASE_URL}/drivers?session_key=${sessionKey}`);
    if (!driversRes.ok) {
      throw new Error(`Помилка запиту пілотів: ${driversRes.status}`);
    }
    const driversData: F1Driver[] = await driversRes.json();

    // Невелика пауза проти rate-limit OpenF1 (3 req/sec)
    await new Promise((r) => setTimeout(r, 350));

    let positionsData: Array<{ driver_number: number; position: number }> = [];
    try {
      const positionsRes = await fetchWithRetry(`${BASE_URL}/position?session_key=${sessionKey}`);
      if (positionsRes.ok) {
        const json = await positionsRes.json();
        if (Array.isArray(json)) {
          positionsData = json;
        }
      }
    } catch (posErr) {
      console.warn('Не вдалося отримати позиції:', posErr);
    }

    const lastPositionsMap = new Map<number, number>();
    for (const item of positionsData) {
      lastPositionsMap.set(item.driver_number, item.position);
    }

    const uniqueDriversMap = new Map<number, F1Driver>();
    driversData.forEach((driver) => {
      if (!uniqueDriversMap.has(driver.driver_number)) {
        const pos = lastPositionsMap.get(driver.driver_number) ?? null;
        uniqueDriversMap.set(driver.driver_number, {
          ...driver,
          position: pos,
        });
      }
    });

    const hasRealPositions = lastPositionsMap.size > 0;

    // Якщо є реальні позиції — сортуємо за класифікацією P1 -> P20.
    // Якщо позицій немає (майбутня гонка) — сортуємо за номером боліда (#1 -> #99).
    return Array.from(uniqueDriversMap.values()).sort((a, b) => {
      if (hasRealPositions && a.position != null && b.position != null) {
        return a.position - b.position;
      }
      return a.driver_number - b.driver_number;
    });
  } catch (error) {
    console.error(`API getDriversBySession (${sessionKey}) error:`, error);
    throw error;
  }
}

export function normalizeHexColor(hex: string | null | undefined, fallback: string = '#E10600'): string {
  if (!hex) return fallback;
  const cleanHex = hex.trim().replace(/^#/, '');
  return cleanHex.length === 6 ? `#${cleanHex}` : fallback;
}
