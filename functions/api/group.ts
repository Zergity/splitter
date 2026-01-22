interface Env {
  SPLITTER_KV: KVNamespace;
}

interface Member {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  createdAt: string;
}

const DEFAULT_GROUP: Group = {
  id: 'default',
  name: 'Expenses',
  currency: 'K',
  members: [],
  createdAt: new Date().toISOString(),
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const group = await context.env.SPLITTER_KV.get<Group>('group', 'json');
    return Response.json({
      success: true,
      data: group || DEFAULT_GROUP,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
};

// Deduplicate members by name (case-insensitive), keeping the first occurrence
function deduplicateMembers(members: Member[]): Member[] {
  const seen = new Set<string>();
  return members.filter((m) => {
    const lowerName = m.name.toLowerCase();
    if (seen.has(lowerName)) {
      return false;
    }
    seen.add(lowerName);
    return true;
  });
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const updates = await context.request.json() as Partial<Group>;
    const existing = await context.env.SPLITTER_KV.get<Group>('group', 'json');
    const group = existing || DEFAULT_GROUP;

    // Deduplicate members if provided
    const members = updates.members
      ? deduplicateMembers(updates.members)
      : group.members;

    const updated: Group = {
      ...group,
      name: updates.name ?? group.name,
      currency: updates.currency ?? group.currency,
      members,
    };

    await context.env.SPLITTER_KV.put('group', JSON.stringify(updated));

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to update group' },
      { status: 500 }
    );
  }
};
