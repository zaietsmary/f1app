export interface F1Session {
  session_key: number;
  session_name: string;
  session_type?: string;
  date_start: string;
  date_end: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  location: string;
  year: number;
  circuit_key?: number;
  meeting_key?: number;
  grand_prix_name?: string;
}

export interface F1Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string | null;
  headshot_url: string | null;
  country_code: string | null;
  session_key: number;
  position?: number | null;
}

export type RootStackParamList = {
  Home: undefined;
  SessionDetails: {
    session: F1Session;
  };
};
