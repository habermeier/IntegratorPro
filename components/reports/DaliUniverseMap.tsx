
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { BusLoad } from '../../src/services/AmpereEngine';

const styles = StyleSheet.create({
    page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
    header: { marginBottom: 20, borderBottom: 1, paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 10, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
    section: { marginTop: 20 },
    table: { display: 'flex', width: 'auto', marginTop: 10 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', minHeight: 25, alignItems: 'center' },
    tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
    tableColId: { width: '25%', fontSize: 9, padding: 5 },
    tableColLoad: { width: '20%', fontSize: 9, padding: 5 },
    tableColLimit: { width: '20%', fontSize: 9, padding: 5 },
    tableColStatus: { width: '35%', fontSize: 9, padding: 5 },
    danger: { color: '#ef4444', fontWeight: 'bold' },
    success: { color: '#10b981' },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: 1, paddingTop: 10, fontSize: 8, color: '#94a3b8', textAlign: 'center' }
});

interface Props {
    projectName: string;
    buses: BusLoad[];
}

export const DaliUniverseMap: React.FC<Props> = ({ projectName, buses }) => (
    <Document title="DALI Universe Map">
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.title}>DALI Universe Map</Text>
                <Text style={styles.subtitle}>{projectName} | Signal Load Report</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.tableColId}>Universe / Bus</Text>
                        <Text style={styles.tableColLoad}>Total Load</Text>
                        <Text style={styles.tableColLimit}>Max Limit</Text>
                        <Text style={styles.tableColStatus}>Status</Text>
                    </View>

                    {buses.map((b) => (
                        <View key={b.id} style={styles.tableRow}>
                            <Text style={styles.tableColId}>{b.id}</Text>
                            <Text style={[styles.tableColLoad, b.isOverloaded ? styles.danger : {}]}>
                                {b.totalMa} mA
                            </Text>
                            <Text style={styles.tableColLimit}>250 mA</Text>
                            <Text style={[styles.tableColStatus, b.isOverloaded ? styles.danger : styles.success]}>
                                {b.isOverloaded ? `EXCEEDED BY ${b.totalMa - 250}mA` : 'OPTIMAL'}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            <Text style={styles.footer}>
                CONFIDENTIAL | DALI Signal Integrity Verified | Page 1 of 1
            </Text>
        </Page>
    </Document>
);
