import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UserCheck,
  UserPlus,
  Key,
  Trash2,
  Edit2,
  Search,
  Eye,
  EyeOff,
  Wand2,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface EngineerUser {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  assigned_schemes_count: number;
  assigned_scheme_ids: string[];
  assigned_scheme_names: string[];
}

interface DirectoryEngineer {
  name: string;
  email: string;
  phone: string;
  role_title: string;
  region?: string | null;
  district?: string | null;
  division?: string | null;
  schemes: string[];
  schemes_count: number;
  is_registered: boolean;
  existing_username?: string;
}

export default function EngineerManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states for creating new engineer
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit / Reset Modal State
  const [editingEngineer, setEditingEngineer] = useState<EngineerUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete Modal State
  const [deletingEngineer, setDeletingEngineer] = useState<EngineerUser | null>(null);

  // Active view tab inside manager
  const [viewSection, setViewSection] = useState<'registered' | 'roster'>('registered');

  // Fetch registered engineer users
  const {
    data: engineersData,
    isLoading: isLoadingEngineers,
    refetch: refetchEngineers,
  } = useQuery<{ success: boolean; count: number; engineers: EngineerUser[] }>({
    queryKey: ['/api/admin/engineers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/engineers');
      if (!res.ok) throw new Error('Failed to fetch engineer accounts');
      return res.json();
    },
  });

  // Fetch field engineer directory roster
  const {
    data: directoryData,
    isLoading: isLoadingDirectory,
    refetch: refetchDirectory,
  } = useQuery<{ success: boolean; directory: DirectoryEngineer[] }>({
    queryKey: ['/api/admin/engineers/directory'],
    queryFn: async () => {
      const res = await fetch('/api/admin/engineers/directory');
      if (!res.ok) throw new Error('Failed to fetch field engineer roster');
      return res.json();
    },
  });

  const engineersList = engineersData?.engineers || [];
  const directoryList = directoryData?.directory || [];

  // Filtered engineers list
  const filteredEngineers = engineersList.filter((eng) => {
    const term = searchTerm.toLowerCase();
    return (
      eng.name?.toLowerCase().includes(term) ||
      eng.username?.toLowerCase().includes(term) ||
      eng.email?.toLowerCase().includes(term) ||
      (eng.phone && eng.phone.includes(term))
    );
  });

  // Generate suggested username from name
  const generateSuggestedUsername = (fullName: string) => {
    const clean = fullName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15);
    return clean ? `eng_${clean}` : '';
  };

  // Generate a random secure password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%';
    let result = 'JJM@';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Pre-fill form from roster item
  const handleSelectFromRoster = (rosterItem: DirectoryEngineer) => {
    setName(rosterItem.name);
    setEmail(rosterItem.email);
    setPhone(rosterItem.phone || '');
    setUsername(generateSuggestedUsername(rosterItem.name));
    setPassword(generateRandomPassword());
    setShowPassword(true);
    setViewSection('registered');

    toast({
      title: 'Engineer Details Auto-filled',
      description: `Loaded ${rosterItem.name} (${rosterItem.role_title}). You can now review and create their login credentials.`,
    });
  };

  // Create Engineer Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!username.trim() || !password.trim() || !name.trim() || !email.trim()) {
        throw new Error('Please fill in all required fields (Username, Password, Name, Email)');
      }
      const res = await fetch('/api/admin/engineers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password: password.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create engineer');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: '✅ Engineer Account Created',
        description: `Login credentials for '${data.engineer.username}' have been generated with role 'engineer'.`,
      });
      // Reset form
      setUsername('');
      setPassword('');
      setName('');
      setEmail('');
      setPhone('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/engineers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/engineers/directory'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Creation Error',
        description: err.message || 'Failed to create engineer account',
        variant: 'destructive',
      });
    },
  });

  // Edit Engineer Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingEngineer) return;
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim() || null,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/engineers/${editingEngineer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update engineer account');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Account Updated',
        description: `Engineer account '${data.engineer.username}' was updated successfully.`,
      });
      setEditingEngineer(null);
      setEditPassword('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/engineers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/engineers/directory'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update engineer details',
        variant: 'destructive',
      });
    },
  });

  // Delete Engineer Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/engineers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete engineer');
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Account Deleted',
        description: `Engineer account has been removed from the users database.`,
      });
      setDeletingEngineer(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/engineers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/engineers/directory'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Deletion Failed',
        description: err.message || 'Could not delete engineer',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-800 border-blue-200/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Registered Engineer Logins
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {engineersList.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Engineers with active portal login credentials
              </p>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-slate-900 dark:to-slate-800 border-emerald-200/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Field Roster Engineers
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {directoryList.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Identified from scheme master data records
              </p>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-slate-900 dark:to-slate-800 border-amber-200/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Pending Login Setup
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {directoryList.filter((d) => !d.is_registered).length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Roster engineers awaiting portal account setup
              </p>
            </div>
            <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md">
              <Key className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Creation Card */}
      <Card className="border-blue-100 dark:border-slate-800 shadow-md">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Create Engineer Login Credentials
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Only Administrators have authority to create and assign engineer portal accounts in the users table.
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 font-mono text-xs w-fit">
              Role: engineer
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Engineer Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g., Rajesh Sharma"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!username && e.target.value) {
                      setUsername(generateSuggestedUsername(e.target.value));
                    }
                  }}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Official Email Address <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="engineer@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-xs pl-8"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Used for matching assigned schemes & alert notifications
                </p>
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mobile Number (Optional)
                </Label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="e.g., 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-xs pl-8"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Login Username <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g., eng_rajesh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Login Password <span className="text-rose-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPassword(generateRandomPassword());
                      setShowPassword(true);
                    }}
                    className="h-6 px-2 text-[11px] text-blue-600 hover:text-blue-800"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Generate Secure Password
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-xs pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>The created user will have access restricted to the Engineer Portal.</span>
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-4 shadow-sm"
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Create Engineer Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Directory & Registered Engineers Dual View */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={viewSection === 'registered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewSection('registered')}
                className={`h-8 text-xs font-semibold ${
                  viewSection === 'registered' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                Active Logins ({engineersList.length})
              </Button>

              <Button
                variant={viewSection === 'roster' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewSection('roster')}
                className={`h-8 text-xs font-semibold ${
                  viewSection === 'roster' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                Scheme Master Roster ({directoryList.length})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search by name, email, user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchEngineers();
                  refetchDirectory();
                }}
                className="h-8 px-2.5 text-xs text-slate-600"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {viewSection === 'registered' ? (
            /* Registered Engineers Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/60">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-700">Engineer Details</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Login Username</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Official Contact</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Assigned Schemes</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEngineers ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-blue-500" />
                        Loading registered engineer credentials...
                      </TableCell>
                    </TableRow>
                  ) : filteredEngineers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        No engineer accounts found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEngineers.map((eng) => (
                      <TableRow key={eng.id} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900 dark:text-white">
                            {eng.name || 'Unnamed Engineer'}
                          </div>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] mt-1 font-normal">
                            Role: {eng.role}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3">
                          <code className="text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400">
                            {eng.username}
                          </code>
                        </TableCell>

                        <TableCell className="py-3 text-xs space-y-0.5">
                          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{eng.email || '-'}</span>
                          </div>
                          {eng.phone && (
                            <div className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{eng.phone}</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-3">
                          {eng.assigned_schemes_count > 0 ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-medium">
                              <Layers className="w-3 h-3 mr-1 text-emerald-600" />
                              {eng.assigned_schemes_count} Scheme{eng.assigned_schemes_count > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 text-[11px]">
                              No schemes matched
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingEngineer(eng);
                                setEditName(eng.name || '');
                                setEditEmail(eng.email || '');
                                setEditPhone(eng.phone || '');
                                setEditPassword('');
                              }}
                              className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit / Reset
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingEngineer(eng)}
                              className="h-7 px-2 text-xs bg-rose-600 hover:bg-rose-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Field Engineers Master Roster */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/60">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-700">Engineer Name</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Designation / Role</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Contact</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Location / Schemes</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Portal Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDirectory ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-emerald-500" />
                        Scanning field engineer directory...
                      </TableCell>
                    </TableRow>
                  ) : directoryList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        No engineer records discovered in scheme engineer master data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    directoryList
                      .filter((d) => {
                        const term = searchTerm.toLowerCase();
                        return (
                          d.name.toLowerCase().includes(term) ||
                          d.email.toLowerCase().includes(term) ||
                          d.role_title.toLowerCase().includes(term) ||
                          (d.region && d.region.toLowerCase().includes(term))
                        );
                      })
                      .map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="py-3 font-semibold text-xs text-slate-900 dark:text-white">
                            {item.name}
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]"
                            >
                              {item.role_title}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3 text-xs space-y-0.5">
                            <div className="text-slate-700 flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{item.email || '-'}</span>
                            </div>
                            {item.phone && (
                              <div className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{item.phone}</span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-xs">
                            <div className="text-slate-700 font-medium">
                              {item.region || item.division || 'Maharashtra'}
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {item.schemes_count} scheme{item.schemes_count > 1 ? 's' : ''} linked
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            {item.is_registered ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Registered ({item.existing_username})
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                No Account Yet
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            {!item.is_registered ? (
                              <Button
                                size="sm"
                                onClick={() => handleSelectFromRoster(item)}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Setup Login
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                className="h-7 px-2 text-xs text-slate-400"
                              >
                                Ready
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Reset Password Dialog Modal */}
      <Dialog open={Boolean(editingEngineer)} onOpenChange={(open) => !open && setEditingEngineer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-600" />
              Edit Engineer Account ({editingEngineer?.username})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update personal details or reset login password for this engineer.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate();
            }}
            className="space-y-3.5 py-2"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Mobile Number</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Reset Password (Leave blank to keep unchanged)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditPassword(generateRandomPassword());
                    setShowEditPassword(true);
                  }}
                  className="h-5 px-1 text-[10px] text-blue-600"
                >
                  Generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder="Enter new password (optional)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="h-8 text-xs pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingEngineer(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editMutation.isPending}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog Modal */}
      <Dialog open={Boolean(deletingEngineer)} onOpenChange={(open) => !open && setDeletingEngineer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Engineer Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete login credentials for{' '}
              <strong>{deletingEngineer?.name}</strong> (<code>{deletingEngineer?.username}</code>)? This
              engineer will no longer be able to log in to the portal.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingEngineer(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deletingEngineer && deleteMutation.mutate(deletingEngineer.id)}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
