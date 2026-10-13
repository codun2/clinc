<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adoption_ads', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(User::class)->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('species');            // dog | cat | rabbit | bird | other
            $table->string('age')->nullable();    // free text, e.g. "سنتان" / "6 months"
            $table->string('city')->nullable();
            $table->string('contact')->nullable(); // how to reach the poster (phone / whatsapp)
            $table->text('description')->nullable();
            $table->string('photo');
            $table->string('status')->default('active'); // active | hidden
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adoption_ads');
    }
};
