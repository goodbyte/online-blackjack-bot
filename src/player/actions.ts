export interface Actions {
  stand(): Promise<void>;
  hit(): Promise<void>;
  double(): Promise<void>;
  split(): Promise<void>;
}