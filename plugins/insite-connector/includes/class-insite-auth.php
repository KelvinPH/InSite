<?php
/**
 * Request authentication for InSite REST endpoints.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_Auth {
	/**
	 * Validate HMAC headers and nonce reuse.
	 *
	 * @param WP_REST_Request $request
	 * @return true|WP_Error
	 */
	public static function permission_check( $request ) {
		$secret = get_option( INSITE_OPTION_SECRET );
		if ( ! $secret ) {
			return new WP_Error( 'insite_unpaired', 'Connector secret not configured.', array( 'status' => 401 ) );
		}

		$timestamp = $request->get_header( 'x-insite-timestamp' );
		$nonce     = $request->get_header( 'x-insite-nonce' );
		$signature = $request->get_header( 'x-insite-signature' );

		if ( ! $timestamp || ! $nonce || ! $signature ) {
			return new WP_Error( 'insite_missing_headers', 'Missing auth headers.', array( 'status' => 401 ) );
		}

		$now = time();
		if ( ! ctype_digit( (string) $timestamp ) ) {
			return new WP_Error( 'insite_invalid_timestamp', 'Invalid timestamp.', array( 'status' => 401 ) );
		}
		if ( abs( $now - (int) $timestamp ) > InSite_HMAC::MAX_SKEW_SECONDS ) {
			return new WP_Error( 'insite_timestamp_skew', 'Request timestamp out of range.', array( 'status' => 401 ) );
		}

		$nonce_key = INSITE_TRANSIENT_NONCE_PREFIX . md5( $nonce );
		if ( get_transient( $nonce_key ) ) {
			return new WP_Error( 'insite_nonce_reuse', 'Nonce already used.', array( 'status' => 401 ) );
		}

		$method = $request->get_method();
		$path   = self::request_path( $request );
		$body   = $request->get_body();
		if ( null === $body ) {
			$body = '';
		}

		$expected = InSite_HMAC::sign( $method, $path, (string) $timestamp, (string) $nonce, $body, $secret );
		if ( ! InSite_HMAC::signatures_equal( $expected, $signature ) ) {
			return new WP_Error( 'insite_bad_signature', 'Invalid signature.', array( 'status' => 401 ) );
		}

		set_transient( $nonce_key, 1, InSite_HMAC::MAX_SKEW_SECONDS + 60 );

		return true;
	}

	/**
	 * Path used for signing — must match what the dashboard signs.
	 *
	 * @param WP_REST_Request $request
	 * @return string
	 */
	private static function request_path( $request ) {
		$route = $request->get_route();
		return '/wp-json' . $route;
	}
}
