export const applySpaceFilter = <T extends { eq: any; is: any }>(
  query: T,
  userId: string,
  spaceId: string | null,
) => {
  if (spaceId) {
    return query.eq("space_id", spaceId);
  }

  return query.eq("user_id", userId).is("space_id", null);
};

export const getSpacePayload = (spaceId: string | null) => ({
  space_id: spaceId,
});
