export type GroupType = "trip" | "home" | "couple" | "other";
export type SplitType = "equal" | "exact" | "percentage" | "shares";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  default_currency: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  type: GroupType;
  avatar_url: string | null;
  default_currency: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: Profile;
};

export type Expense = {
  id: string;
  group_id: string;
  paid_by: string;
  amount_cents: number;
  currency: string;
  description: string;
  category: string | null;
  expense_date: string;
  split_type: SplitType;
  receipt_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
};

export type ExpenseShare = {
  expense_id: string;
  user_id: string;
  share_cents: number;
};

export type Payment = {
  id: string;
  group_id: string | null;
  from_user: string;
  to_user: string;
  amount_cents: number;
  currency: string;
  note: string | null;
  paid_at: string;
  created_at: string;
};

export type ExpenseWithShares = Expense & {
  shares: ExpenseShare[];
  payer?: Profile;
};
