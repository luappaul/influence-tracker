import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST: Supprimer toutes les mentions (admin only)
export async function POST() {
  try {
    const supabase = createServiceClient();

    // Supprimer toutes les mentions
    const { error, count } = await supabase
      .from('instagram_mentions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq avec un UUID impossible)

    if (error) {
      console.error('[Admin] Error clearing mentions:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Admin] All mentions cleared');
    return NextResponse.json({
      success: true,
      message: 'Toutes les mentions ont été supprimées',
    });

  } catch (error) {
    console.error('[Admin] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
