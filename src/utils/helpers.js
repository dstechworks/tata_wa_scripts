function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function nameHelper(x) {
    if (x && x.toString().trim().length > 0) {
        const name = x.toString().split('/')[0].trim().toUpperCase();
        return name;
    }
    return undefined;
}

function numberHelper(x) {
    if (x && x.toString().trim().length >= 10) {
        const number = x.toString().split('/')[0].replace(/[.\s]/g, '').substring(0, 10);
        return number.length === 10 ? number : undefined;
    }
    return undefined;
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

module.exports = { delay, nameHelper, numberHelper, conditionCheckerHelper, areAllZonesZero };