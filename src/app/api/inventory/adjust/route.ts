import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/auth/session';
import { adjustInventoryQuantity } from '@/modules/inventory/actions';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    const { stockId, adjustment, notes, newReorderLevel } = body;
    const res = await adjustInventoryQuantity(
      stockId,
      Number(adjustment) || 0,
      user.id,
      newReorderLevel !== undefined ? Number(newReorderLevel) : undefined,
      notes
    );
    return NextResponse.json({ data: res }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 400 });
  }
}
