<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Consultation;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * بيانات تجريبية عربية تطابق تصميم الواجهة (design/index.html).
 * idempotent — آمن لإعادة التشغيل.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(PlatformOwnerSeeder::class);

        $clinic = Clinic::firstOrCreate(
            ['slug' => 'alnoor'],
            [
                'name'    => 'عيادة النور الطبية',
                'status'  => 'active',
                'phone'   => '920001234',
                'email'   => 'info@alnoor-clinic.com',
                'address' => 'الرياض — حي الملقا، طريق الملك فهد',
            ],
        );
        $cid = $clinic->id;

        // ===== الفريق =====
        $mkUser = fn (array $attrs) => User::withoutGlobalScopes()->updateOrCreate(
            ['email' => $attrs['email']],
            $attrs + ['clinic_id' => $cid, 'status' => 'active'],
        );

        $admin = $mkUser([
            'name' => 'هند ناصر', 'email' => 'admin@clinic.com',
            'role' => 'admin', 'title' => null, 'password' => 'admin123',
            'phone' => '0550000001',
        ]);

        $sara = $mkUser([
            'name' => 'د. سارة أحمد', 'email' => 'sara@clinic.com',
            'role' => 'staff', 'title' => 'طبيبة باطنية', 'password' => 'doctor123',
            'phone' => '0550000002',
            'permissions' => ['appointments', 'patients', 'consultations', 'invoices'],
        ]);

        $khaled = $mkUser([
            'name' => 'د. خالد المطيري', 'email' => 'khaled@clinic.com',
            'role' => 'staff', 'title' => 'طبيب أسنان', 'password' => 'doctor123',
            'phone' => '0550000003',
            'permissions' => ['appointments', 'patients', 'consultations', 'invoices'],
        ]);

        $reem = $mkUser([
            'name' => 'د. ريم العلي', 'email' => 'reem@clinic.com',
            'role' => 'staff', 'title' => 'طبيبة جلدية', 'password' => 'doctor123',
            'phone' => '0550000004',
            'permissions' => ['appointments', 'patients', 'consultations', 'invoices'],
        ]);

        $mkUser([
            'name' => 'أمل فهد', 'email' => 'reception@clinic.com',
            'role' => 'staff', 'title' => null, 'password' => 'reception123',
            'phone' => '0550000005',
            'permissions' => ['appointments', 'patients'],
        ]);

        $mkUser([
            'name' => 'عمر راشد', 'email' => 'accountant@clinic.com',
            'role' => 'staff', 'title' => null, 'password' => 'account123',
            'phone' => '0550000006',
            'permissions' => ['invoices'],
        ]);

        // ===== الخدمات والأسعار =====
        $services = [
            ['name' => 'كشف عام',        'department' => 'باطنية', 'price' => 150],
            ['name' => 'متابعة',          'department' => 'باطنية', 'price' => 80],
            ['name' => 'كشف أسنان',       'department' => 'أسنان',  'price' => 120],
            ['name' => 'تنظيف أسنان',     'department' => 'أسنان',  'price' => 350],
            ['name' => 'حشو أسنان',       'department' => 'أسنان',  'price' => 250],
            ['name' => 'كشف جلدية',       'department' => 'جلدية',  'price' => 150],
            ['name' => 'كشف عظام',        'department' => 'عظام',   'price' => 160],
            ['name' => 'تحليل دم شامل',   'department' => 'مختبر',  'price' => 180],
            ['name' => 'أشعّة صدر',       'department' => 'أشعّة',  'price' => 120],
        ];
        foreach ($services as $s) {
            Service::withoutGlobalScopes()->firstOrCreate(
                ['clinic_id' => $cid, 'name' => $s['name']],
                $s + ['clinic_id' => $cid, 'active' => true],
            );
        }

        // ===== المرضى (من التصميم) =====
        $mkPatient = function (array $attrs) use ($cid) {
            return Patient::withoutGlobalScopes()->firstOrCreate(
                ['clinic_id' => $cid, 'phone' => $attrs['phone']],
                $attrs + ['clinic_id' => $cid],
            );
        };

        $mohammed = $mkPatient([
            'file_no' => '10428', 'name' => 'محمد العتيبي', 'phone' => '0551234567',
            'gender' => 'male', 'birthdate' => '1992-03-12', 'national_id' => '1098765432',
            'address' => 'الرياض — الملقا', 'blood_type' => 'O+',
            'allergies' => 'بنسلين', 'chronic_conditions' => 'ارتفاع ضغط — منذ 2024',
            'emergency_phone' => '0554447788',
        ]);

        $lama = $mkPatient([
            'file_no' => '10311', 'name' => 'لمى الحربي', 'phone' => '0569876543',
            'gender' => 'female', 'birthdate' => '1985-06-20',
            'chronic_conditions' => 'سكري نوع 2',
        ]);

        $noura = $mkPatient([
            'file_no' => '10502', 'name' => 'نورة القحطاني', 'phone' => '0533219876',
            'gender' => 'female', 'birthdate' => '1999-01-15',
        ]);

        $khalidS = $mkPatient([
            'file_no' => '10127', 'name' => 'خالد السالم', 'phone' => '0545671234',
            'gender' => 'male', 'birthdate' => '1970-09-02',
            'chronic_conditions' => 'ارتفاع ضغط',
        ]);

        $fahd = $mkPatient([
            'file_no' => '10477', 'name' => 'فهد الزهراني', 'phone' => '0501112233',
            'gender' => 'male', 'birthdate' => '1997-11-30',
        ]);

        // ===== مواعيد اليوم (مرة واحدة) =====
        if (! Appointment::withoutGlobalScopes()->where('clinic_id', $cid)->whereDate('scheduled_at', today())->exists()) {
            $mk = fn ($patient, $doctor, $dept, $type, $time, $status, $extra = []) => Appointment::withoutGlobalScopes()->create([
                'clinic_id'    => $cid,
                'patient_id'   => $patient->id,
                'doctor_id'    => $doctor?->id,
                'department'   => $dept,
                'type'         => $type,
                'scheduled_at' => today()->setTimeFromTimeString($time),
                'status'       => $status,
            ] + $extra);

            $a1 = $mk($mohammed, $sara, 'باطنية', 'new', '09:00', 'completed');
            $mk($lama, $sara, 'باطنية', 'followup', '09:30', 'in_progress');
            $mk($noura, $reem, 'جلدية', 'new', '10:00', 'arrived', ['arrived_at' => now()->subMinutes(12)]);
            $mk($khalidS, $khaled, 'عظام', 'followup', '10:30', 'arrived', ['arrived_at' => now()->subMinutes(5)]);
            $mk($fahd, $khaled, 'أسنان', 'new', '11:00', 'confirmed', ['source' => 'online']);

            // كشف مكتمل + فاتورة مدفوعة للموعد الأول
            $c = Consultation::withoutGlobalScopes()->create([
                'clinic_id'      => $cid,
                'patient_id'     => $mohammed->id,
                'doctor_id'      => $sara->id,
                'appointment_id' => $a1->id,
                'bp'             => '128/82', 'pulse' => 76, 'temp' => 37.1, 'weight' => 78,
                'complaint'      => 'صداع وحرارة منذ يومين، سعال جاف.',
                'examination'    => 'الحلق محتقن، الصدر سليم.',
                'diagnosis'      => 'التهاب حلق بكتيري',
                'prescription'   => [['drug' => 'باراسيتامول 500', 'dose' => 'حبة كل 8 ساعات', 'duration' => '5 أيام']],
                'orders'         => ['تحليل دم شامل'],
                'status'         => 'final',
                'finished_at'    => now(),
            ]);

            Invoice::withoutGlobalScopes()->create([
                'clinic_id'       => $cid,
                'patient_id'      => $mohammed->id,
                'consultation_id' => $c->id,
                'number'          => '2451',
                'items'           => [['name' => 'كشف عام', 'price' => 150], ['name' => 'تحليل دم شامل', 'price' => 90]],
                'total'           => 240,
                'method'          => 'card',
                'status'          => 'paid',
                'paid_at'         => now(),
                'recorded_by'     => 'عمر راشد',
            ]);

            // فاتورة معلّقة للمى (كما في التصميم)
            Invoice::withoutGlobalScopes()->create([
                'clinic_id'   => $cid,
                'patient_id'  => $lama->id,
                'number'      => '2452',
                'items'       => [['name' => 'متابعة', 'price' => 60]],
                'total'       => 60,
                'status'      => 'pending',
                'recorded_by' => 'عمر راشد',
            ]);
        }

        $this->command?->info('عيادة النور جاهزة — admin@clinic.com/admin123، sara@clinic.com/doctor123');
    }
}
