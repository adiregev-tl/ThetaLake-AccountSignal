import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userIdToUpdate } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Can't change your own role
    if (user.id === userIdToUpdate) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Check if current user is admin
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null };

    if (!currentProfile || currentProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const { role } = body;

    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ error: 'Invalid role. Must be "admin" or "user"' }, { status: 400 });
    }

    // Update role in profiles table
    const { data: updatedProfile, error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ role })
      .eq('id', userIdToUpdate)
      .select('email, role')
      .single() as { data: { email: string; role: string } | null; error: any };

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    if (!updatedProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `User ${updatedProfile.email} role updated to ${role}` });
  } catch (error) {
    console.error('Update role API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userIdToDelete } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent self-deletion
    if (user.id === userIdToDelete) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if current user is admin
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null };

    if (!currentProfile || currentProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Check if target user exists and is not an admin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', userIdToDelete)
      .single() as { data: { role: string; email: string } | null };

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting other admins (optional safety measure)
    if (targetProfile.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 400 });
    }

    // Delete from profiles table (this will cascade due to foreign key)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userIdToDelete);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 });
    }

    // Delete from auth.users using service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userIdToDelete);

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // Profile is already deleted, log the error but return success
      }
    }

    return NextResponse.json({ success: true, message: `User ${targetProfile.email} deleted` });
  } catch (error) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
