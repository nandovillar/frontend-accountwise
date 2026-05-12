type ExpensePermissionInput = {
  activeSpaceId: string | null;
  currentUserId: string | null;
  ownerUserId?: string | null;
};

const ownsItem = ({ currentUserId, ownerUserId }: ExpensePermissionInput) => {
  return Boolean(currentUserId && ownerUserId && currentUserId === ownerUserId);
};

export const canEditExpense = (input: ExpensePermissionInput) => {
  if (!input.activeSpaceId) return true;
  return ownsItem(input);
};

export const canDeleteExpense = canEditExpense;

export const canMoveExpense = canEditExpense;

export const canToggleFixedPaid = () => true;

export const canEditSharedFixedDetails = (input: ExpensePermissionInput) => {
  return !input.activeSpaceId && canEditExpense(input);
};
