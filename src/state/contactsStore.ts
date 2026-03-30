import { create } from 'zustand';

interface ContactsState {
  contacts: any[];
  setContacts: (c: any[]) => void;
  resetContacts: () => void;
}

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  setContacts: (c) => set({ contacts: c }),
  resetContacts: () => set({ contacts: [] }),
}));
