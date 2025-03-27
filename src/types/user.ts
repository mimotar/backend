
export interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  verified: boolean;
  verificationToken?: string | null; // Nullable string
  profile?: Profile | null; 
  provider?: string | null;
  subject?: string | null;
  transaction: Transaction[]; 
  notification: Notification[]; 
  Sender: Chat[]; 
  Receiver: Chat[]; 
  disputeSender_id?: Dispute | null; 
  disputeReceiver_id?: Dispute | null; 
}

export interface Profile {
    id: number;
    address?: string | null;
    phone_no?: string | null;
    avatar?: string | null;
    bio?: string | null;
    verification_no?: string | null;
    verification_type?: string | null;
    next_kin?: string | null;
    next_email?: string | null;
    next_no?: string | null;
    user: User; 
    user_id: number;
  }


  export interface Transaction {
    id: number;
    amount: number;
    description: string;
    user: User; 
    user_id: number;
    status_id: Status;
    pay_escrow_fee: number;
    additional_agreement: string;
    pay_shipping_cost: number;
    creator_fullname: string;
    creator_email: string;
    creator_no: string;
    creator_address: string;
    creator_role: string;
    dispute?: Dispute | null;
    receiver_fullname: string;
    receiver_no: string;
    receiver_address: string;
    link_expires: boolean;
    txn_link: string;
    agreement: string;
    txn_type: string;
    duration: Date;
    created_at: Date;
  }
  
  enum Status {
    ongoing = "ongoing",
    dispute = "dispute",
    cancel = "cancel",
    completed = "completed",
  }


  export interface Chat {
    id: number;
    content: string;
    timestamp: Date;
    sender: User;
    sender_user_id: number;
    receiver: User; 
    receiver_user_id: number;
    dispute?: Dispute | null; 
  }


  export interface Dispute {
    id: number;
    transaction: Transaction;
    transactionId: number;
    amount: number;
    status: Transactionstatus;
    statusId: number;
    timestamp: Date;
    elapsed: Date;
    chat: Chat;
    chatId: number;
    user: User;
    sender_userId: number;
    receiver: User;
    receiver_userId: number;
  }
  
  interface Transactionstatus {
    id: number;
  }