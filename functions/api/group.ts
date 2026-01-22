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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const updates = await context.request.json() as Partial<Group>;
    const existing = await context.env.SPLITTER_KV.get<Group>('group', 'json');
    const group = existing || DEFAULT_GROUP;

    const updated: Group = {
      ...group,
      name: updates.name ?? group.name,
      currency: updates.currency ?? group.currency,
      members: updates.members ?? group.members,
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
