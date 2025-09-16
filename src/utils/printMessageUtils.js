// Utility functions for creating national status messages

function createIbcNationalMessage(zoneStatus) {
    return `NATIONAL IBC-BACKWALL STATUS
North : ${zoneStatus.N.active} (Active) / ${zoneStatus.N.inactive} (Inactive)
South : ${zoneStatus.S.active} (Active) / ${zoneStatus.S.inactive} (Inactive)
East  : ${zoneStatus.E.active} (Active) / ${zoneStatus.E.inactive} (Inactive)
West  : ${zoneStatus.W.active} (Active) / ${zoneStatus.W.inactive} (Inactive)`;
}

function createTabletNationalMessage(zoneStatus) {
    return `NATIONAL TABLET STATUS
North : ${zoneStatus.N.active} (Active) / ${zoneStatus.N.inactive} (Inactive)
South : ${zoneStatus.S.active} (Active) / ${zoneStatus.S.inactive} (Inactive)
East  : ${zoneStatus.E.active} (Active) / ${zoneStatus.E.inactive} (Inactive)
West  : ${zoneStatus.W.active} (Active) / ${zoneStatus.W.inactive} (Inactive)`;
}

function createSquad360NationalMessage(zoneStatus) {
    return `NATIONAL SQUAD-360 STATUS
North : ${zoneStatus.N.active} (Active) / ${zoneStatus.N.inactive} (Inactive)
South : ${zoneStatus.S.active} (Active) / ${zoneStatus.S.inactive} (Inactive)
East  : ${zoneStatus.E.active} (Active) / ${zoneStatus.E.inactive} (Inactive)
West  : ${zoneStatus.W.active} (Active) / ${zoneStatus.W.inactive} (Inactive)`;
}

function createTechworksBackwallNationalMessage(zoneStatus) {
    return `NATIONAL TECHWORKS-BACKWALL STATUS
North : ${zoneStatus.N.active} (Active) / ${zoneStatus.N.inactive} (Inactive)
South : ${zoneStatus.S.active} (Active) / ${zoneStatus.S.inactive} (Inactive)
East  : ${zoneStatus.E.active} (Active) / ${zoneStatus.E.inactive} (Inactive)
West  : ${zoneStatus.W.active} (Active) / ${zoneStatus.W.inactive} (Inactive)`;
}

function createDigiQuadNationalMessage(zoneStatus) {
    return `NATIONAL DIGI-QUAD STATUS
North : ${zoneStatus.N.active} (Active) / ${zoneStatus.N.inactive} (Inactive)
South : ${zoneStatus.S.active} (Active) / ${zoneStatus.S.inactive} (Inactive)
East  : ${zoneStatus.E.active} (Active) / ${zoneStatus.E.inactive} (Inactive)
West  : ${zoneStatus.W.active} (Active) / ${zoneStatus.W.inactive} (Inactive)`;
}

function createCombinedNationalMessage(combinedZoneStatus, ibcZoneStatus, digiQuadZoneStatus, squad360ZoneStatus, techworksBackwallZoneStatus, tabletZoneStatus) {
    return `NATIONAL COMBINED STATUS
North : ${combinedZoneStatus.N.active} (Active) / ${combinedZoneStatus.N.inactive} (Inactive)
South : ${combinedZoneStatus.S.active} (Active) / ${combinedZoneStatus.S.inactive} (Inactive)
East  : ${combinedZoneStatus.E.active} (Active) / ${combinedZoneStatus.E.inactive} (Inactive)
West  : ${combinedZoneStatus.W.active} (Active) / ${combinedZoneStatus.W.inactive} (Inactive)
NATIONAL TABLET STATUS
North : ${tabletZoneStatus.N.active} (Active) / ${tabletZoneStatus.N.inactive} (Inactive)
South : ${tabletZoneStatus.S.active} (Active) / ${tabletZoneStatus.S.inactive} (Inactive)
East  : ${tabletZoneStatus.E.active} (Active) / ${tabletZoneStatus.E.inactive} (Inactive)
West  : ${tabletZoneStatus.W.active} (Active) / ${tabletZoneStatus.W.inactive} (Inactive)`;
}

function createCombinedAllSystemsNationalMessage(ibcZoneStatus, digiQuadZoneStatus, squad360ZoneStatus, techworksBackwallZoneStatus, tabletZoneStatus) {
    return `
${createIbcNationalMessage(ibcZoneStatus)}
${createTabletNationalMessage(tabletZoneStatus)}
${createSquad360NationalMessage(squad360ZoneStatus)}
${createTechworksBackwallNationalMessage(techworksBackwallZoneStatus)}
${createDigiQuadNationalMessage(digiQuadZoneStatus)}
`;
}

// Export all functions
module.exports = {
    createIbcNationalMessage,
    createTabletNationalMessage,
    createSquad360NationalMessage,
    createTechworksBackwallNationalMessage,
    createDigiQuadNationalMessage,
    createCombinedNationalMessage,
    createCombinedAllSystemsNationalMessage
};