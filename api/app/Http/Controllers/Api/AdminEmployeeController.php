<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminEmployeeController extends Controller
{
    /** قائمة الموظفين مع بحث وفلاتر (حالة/قسم) وإحصاءات موجزة. */
    public function index(Request $request): JsonResponse
    {
        $q = Employee::query()->with('user:id,role,title,permissions');

        if ($search = trim((string) $request->query('q'))) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhere('employee_number', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%");
            });
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($dept = $request->query('department')) {
            $q->where('department', $dept);
        }

        return response()->json([
            'employees' => $q->orderByDesc('id')->get(),
            'stats'     => [
                'total'    => Employee::count(),
                'active'   => Employee::where('status', 'active')->count(),
                'inactive' => Employee::where('status', 'inactive')->count(),
                'payroll'  => (float) Employee::where('status', 'active')->sum('base_salary'),
            ],
        ]);
    }

    public function show(Employee $employee): JsonResponse
    {
        $employee->load('user:id,email,role,title,status,permissions');

        return response()->json(['employee' => $employee]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $account = $this->validateAccount($request);

        $employee = DB::transaction(function () use ($data, $account, $request) {
            $data['employee_number'] = ($data['employee_number'] ?? null) ?: Employee::nextNumber();
            $employee = Employee::create($data);

            // حساب دخول اختياري مرتبط بالموظف
            if ($request->boolean('create_account')) {
                $user = User::create([
                    'clinic_id'   => $employee->clinic_id,
                    'name'        => $employee->name,
                    'email'       => $account['account_email'],
                    'password'    => $account['account_password'],
                    'role'        => $account['account_role'] ?? 'staff',
                    'title'       => $employee->job_title,
                    'phone'       => $employee->phone,
                    'status'      => 'active',
                    'permissions' => $account['account_permissions'] ?? [],
                ]);
                $employee->update(['user_id' => $user->id]);
            }

            return $employee;
        });

        return response()->json(['employee' => $employee->fresh('user')], 201);
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $employee->update($this->validated($request, $employee));

        // مزامنة بيانات الحساب المرتبط الأساسية
        if ($employee->user) {
            $employee->user->update(array_filter([
                'name'  => $employee->name,
                'title' => $employee->job_title,
                'phone' => $employee->phone,
            ], fn ($v) => $v !== null));
        }

        return response()->json(['employee' => $employee->fresh('user')]);
    }

    public function destroy(Employee $employee): JsonResponse
    {
        // إيقاف حساب الدخول المرتبط (دون حذفه) ثم حذف ناعم للملف
        $employee->user?->update(['status' => 'inactive']);
        $employee->delete();

        return response()->json(['message' => 'تم حذف الموظف.']);
    }

    private function validated(Request $request, ?Employee $employee = null): array
    {
        return $request->validate([
            'employee_number'     => ['nullable', 'string', 'max:40'],
            'name'                => ['required', 'string', 'max:120'],
            'name_en'             => ['nullable', 'string', 'max:120'],
            'job_title'           => ['nullable', 'string', 'max:120'],
            'job_title_en'        => ['nullable', 'string', 'max:120'],
            'department'          => ['nullable', 'string', 'max:60'],
            'phone'               => ['nullable', 'string', 'max:30'],
            'email'               => ['nullable', 'email', 'max:150'],
            'national_id'         => ['nullable', 'string', 'max:40'],
            'id_issue_date'       => ['nullable', 'date'],
            'id_expiry_date'      => ['nullable', 'date'],
            'passport_number'     => ['nullable', 'string', 'max:50'],
            'passport_issue_date' => ['nullable', 'date'],
            'passport_expiry_date' => ['nullable', 'date'],
            'birth_date'          => ['nullable', 'date'],
            'gender'              => ['nullable', Rule::in(Employee::GENDERS)],
            'nationality'         => ['nullable', 'string', 'max:80'],
            'marital_status'      => ['nullable', Rule::in(Employee::MARITAL)],
            'hire_date'           => ['nullable', 'date'],
            'base_salary'         => ['nullable', 'numeric', 'min:0'],
            'iban'                => ['nullable', 'string', 'max:40'],
            'bank_name'           => ['nullable', 'string', 'max:80'],
            'status'              => ['nullable', Rule::in(Employee::STATUSES)],
            'notes'               => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function validateAccount(Request $request): array
    {
        return $request->validate([
            'create_account'      => ['nullable', 'boolean'],
            'account_email'       => ['nullable', 'email', 'required_if:create_account,true,1', 'unique:users,email'],
            'account_password'    => ['nullable', 'string', 'min:6', 'required_if:create_account,true,1'],
            'account_role'        => ['nullable', Rule::in(['admin', 'staff'])],
            'account_permissions' => ['nullable', 'array'],
            'account_permissions.*' => ['string', Rule::in(User::PERMISSIONS)],
        ]);
    }
}
