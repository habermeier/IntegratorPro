#!/usr/bin/env tsx
/**
 * Test script for imperial measurement conversion bug fix
 *
 * Bug: 11.99 inches rounds to 12 inches but feet aren't incremented
 * Expected: 2.7432m (8' 11.99") should display as "9' 0""
 */

import { metersToImperialComponents, formatDistance } from '../utils/measurementUtils';

// OLD BUGGY LOGIC (from DevicePanel.tsx lines 68-73)
function metersToFeetInches_OLD(meters: number): { feet: number; inches: number; display: string } {
    const totalInches = meters * 39.3701;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches, display: `${feet}' ${inches}"` };
}

// Test cases
const testCases = [
    { meters: 2.667, expected: "8' 9\"", description: "Normal case: 8' 8.7\"" },
    { meters: 2.7432, expected: "9' 0\"", description: "Bug case: 8' 11.99\" should round to 9' 0\"" },
    { meters: 2.7305, expected: "9' 0\"", description: "Edge case: 8' 11.5\" rounds to 9' 0\"" },
    { meters: 3.048, expected: "10' 0\"", description: "Exact 10 feet" },
    { meters: 0.1524, expected: "0' 6\"", description: "Exact 6 inches" },
    { meters: 3.6576, expected: "12' 0\"", description: "Exact 12 feet" },
    { meters: -0.1524, expected: "-0' 6\"", description: "Negative 6 inches" },
    { meters: -0.36, expected: "-1' 2\"", description: "Negative 14.17 inches (Negative modulo test)" },
];

console.log("Testing Imperial Conversion Fix\n");
console.log("=".repeat(80));

let oldPassCount = 0;
let newPassCount = 0;

testCases.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.description}`);
    console.log(`Input: ${test.meters}m = ${(test.meters * 39.3701).toFixed(4)} inches`);
    console.log(`Expected: ${test.expected}`);

    const oldResult = metersToFeetInches_OLD(test.meters);
    const newResult = metersToImperialComponents(test.meters);

    const oldPass = oldResult.display === test.expected;
    const newPass = newResult.display === test.expected;

    console.log(`OLD logic: ${oldResult.display} ${oldPass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`NEW logic: ${newResult.display} ${newPass ? '✓ PASS' : '✗ FAIL'}`);

    if (oldPass) oldPassCount++;
    if (newPass) newPassCount++;
});

console.log("\n" + "=".repeat(80));
console.log(`\nOLD logic: ${oldPassCount}/${testCases.length} tests passed`);
console.log(`NEW logic: ${newPassCount}/${testCases.length} tests passed`);

if (newPassCount === testCases.length) {
    console.log("\n✓ All tests passed with NEW logic!");
    process.exit(0);
} else {
    console.log("\n✗ Some tests failed with NEW logic");
    process.exit(1);
}
