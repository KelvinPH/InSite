<?php
/**
 * HMAC helpers — must match packages/shared/src/hmac.ts
 *
 * Canonical string (newline-separated):
 *   METHOD
 *   PATH
 *   TIMESTAMP
 *   NONCE
 *   BODY_HASH
 *
 * BODY_HASH = hex(sha256(rawBody))
 * Signature = hex(hmac-sha256(secret, canonical))
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_HMAC {
	const MAX_SKEW_SECONDS = 300;

	/**
	 * @param string $body Raw request body.
	 * @return string
	 */
	public static function hash_body( $body ) {
		return hash( 'sha256', (string) $body );
	}

	/**
	 * @param string $method
	 * @param string $path
	 * @param string $timestamp
	 * @param string $nonce
	 * @param string $body_hash
	 * @return string
	 */
	public static function build_canonical( $method, $path, $timestamp, $nonce, $body_hash ) {
		return strtoupper( $method ) . "\n" . $path . "\n" . $timestamp . "\n" . $nonce . "\n" . $body_hash;
	}

	/**
	 * @param string $method
	 * @param string $path
	 * @param string $timestamp
	 * @param string $nonce
	 * @param string $body
	 * @param string $secret
	 * @return string
	 */
	public static function sign( $method, $path, $timestamp, $nonce, $body, $secret ) {
		$body_hash = self::hash_body( $body );
		$canonical = self::build_canonical( $method, $path, $timestamp, $nonce, $body_hash );
		return hash_hmac( 'sha256', $canonical, $secret );
	}

	/**
	 * @param string $a
	 * @param string $b
	 * @return bool
	 */
	public static function signatures_equal( $a, $b ) {
		return hash_equals( strtolower( (string) $a ), strtolower( (string) $b ) );
	}
}
