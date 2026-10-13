<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bind the authenticated user's clinic into the container as `currentClinicId`.
 * Every model using the BelongsToClinic trait reads this to scope its queries.
 *
 * Runs after auth:sanctum. Platform super-admins have a null clinic_id, which
 * leaves the tenant scope disabled (they operate across all clinics).
 */
class SetClinicContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            app()->instance('currentClinicId', $user->clinic_id);
        }

        return $next($request);
    }
}
