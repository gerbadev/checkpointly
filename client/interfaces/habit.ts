export interface Checkpoint {
  id: string;
  title: string;
  position: number;
  completed: boolean;
}

export interface Habit {
  id: string;
  title: string;
  checkpoints: Checkpoint[];
}
