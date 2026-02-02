function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function naValueHelper(value) {
    return value ? value : 'NA';
}

function isNaValueFoundHelper(value) {
    return value && value !== 'NA';
}

function spaceCheckerHelper(value) {
    if (value) {
        return value !== 'NA' ? value.toString().split(' ').join('') : 'NA';
    }
    return 'NA';
}

function nameHelper(x) {
    if (x && x.toString().trim().length > 0) {
        const name = x.toString().split('/')[0].trim().toUpperCase();
        return name;
    }
    return 'NA';
}

function numberHelper(x) {
    if (x && x.toString().trim().length >= 10) {
        const number = x.toString().split('/')[0].replace(/[.\s]/g, '').substring(0, 10);
        return number.length === 10 ? number : 'NA';
    }
    return 'NA';
}

function numbersHelper(x) {
    // Handles both single number (e.g., "7676363591") and multiple numbers (e.g., "7676363591 / 6369824733")
    if (!x || x.toString().trim().length === 0) {
        return [];
    }
    
    const numbers = [];
    const parts = x.toString().split('/');
    
    for (let part of parts) {
        const cleaned = part.trim().replace(/[.\s]/g, '');
        if (cleaned.length >= 10) {
            const number = cleaned.substring(0, 10);
            if (number.length === 10 && !numbers.includes(number)) {
                numbers.push(number);
            }
        }
    }
    
    return numbers;
}

function conditionCheckerHelper(x) {
    if (nameHelper(x['AM Name']) && numberHelper(x['AM Mobile No']) && nameHelper(x['Assistant Name']) && numberHelper(x['Assistant Mobile No'])) {
        return true;
    } else {
        return false;
    }
}

function areAllZonesZero(zone) {
    return (
        zone.N?.active === 0 && zone.N?.inactive === 0 &&
        zone.S?.active === 0 && zone.S?.inactive === 0 &&
        zone.E?.active === 0 && zone.E?.inactive === 0 &&
        zone.W?.active === 0 && zone.W?.inactive === 0
    );
}

module.exports = { delay, naValueHelper, isNaValueFoundHelper, spaceCheckerHelper, nameHelper, numberHelper, numbersHelper, conditionCheckerHelper, areAllZonesZero };
