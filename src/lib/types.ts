// 先頭に追加
import type { Timestamp, FieldValue } from 'firebase/firestore';

export type ForgotFlag = '有' | '無' | '未確定';

export type PlanDoc = {
  uid: string;
  dateKey: string;              // 'YYYY-MM-DD'
  dateTs?: Timestamp;           // その日の 00:00
  departures: string[];         // 'HH:mm' 1～2
  items: string[];              // 1～5
  allocation: 'A' | 'B' | 'C';
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};

export type SelfReportDoc = {
  uid: string;
  dateKey: string;
  dateTs?: Timestamp;
  forgot: ForgotFlag;
  burden: number | null;        // 1..5 | null
  note?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};

export type CheckDoc = {
  uid: string;
  dateKey: string;
  dateTs?: Timestamp;
  itemsChecked: string[];
  completedAt?: Timestamp;
  actualDepartureAt?: string;   // 'HH:mm'
  reactedSec?: number[];
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};
