'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Task = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  user_id: string;
};

type Profile = {
  id: string;
  email: string;
  role: string;
};

export default function AdminPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      setChecking(false);
      fetchAllTasks();
      fetchAllUsers();
    };

    checkAdmin();
  }, []);

  const fetchAllTasks = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const tasks = await res.json()

    setLoading(false);
    setTasks(tasks);
  }

    // const { data, error } = await supabase
    //   .from('tasks')
    //   .select('*')
    //   .order('created_at', { ascending: false });

    // if (error) {
    //   console.error('Error fetching tasks:', error);
    // } else {
    //   setTasks(data || []);
    //   // After tasks load, fetch emails for unique user_ids
    //   const uniqueUserIds = [...new Set((data || []).map(t => t.user_id))];
    //   fetchUserEmailsForTasks(uniqueUserIds);
    // }
    // setLoading(false);
  // };

  const fetchUserEmailsForTasks = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching user emails:', error);
    } else {
      const emailMap: Record<string, string> = {};
      data?.forEach(profile => {
        emailMap[profile.id] = profile.email;
      });
      setUserEmails(emailMap);
    }
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .order('email');

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task permanently?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      alert(error.message);
    } else {
      fetchAllTasks();
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert(error.message);
    } else {
      fetchAllUsers();
    }
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center">Checking permissions...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* All Tasks Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">All Tasks (All Users)</h2>
          {loading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-gray-500">No tasks found.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{task.title}</h3>
                      {task.description && (
                        <p className="text-gray-600 mt-1">{task.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {new Date(task.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        User: {userEmails[task.user_id] || task.user_id}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manage Users Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2">
                      {user.role === 'admin' ? (
                        <button
                          onClick={() => updateUserRole(user.id, 'user')}
                          className="text-yellow-600 hover:text-yellow-800 text-sm mr-2"
                        >
                          Demote to User
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUserRole(user.id, 'admin')}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Promote to Admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}