<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(User::class)->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('species');                 // dog | cat | rabbit | bird | other
            $table->string('breed')->nullable();
            $table->string('sex')->nullable();          // male | female
            $table->date('birthdate')->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->boolean('microchipped')->default(false);
            $table->string('emoji')->default('🐾');
            // health snapshot shown as a badge
            $table->string('health_status')->default('healthy'); // healthy | follow_up | surgery | critical
            // live clinic-visit stage for the tracker (null when not at the clinic)
            $table->string('tracker_stage')->nullable();         // checked_in | in_exam | in_treatment | recovery | ready
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};
