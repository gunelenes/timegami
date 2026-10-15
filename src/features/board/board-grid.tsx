import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { GridLayout, GridRow, NO_CELL } from '@/domain';
import { useTheme } from '@/hooks/use-theme';
import { useAppTheme } from '@/theme/theme-provider';

const LABEL_WIDTH = 40;
const GAP = 1;
/** Below this cell width, rows are tapped to zoom in instead of tapping single cells. */
const MIN_TAP_SIZE = 22;
const MIN_ROW_HEIGHT = 14;
const ZOOM_COLUMNS = 10;

export interface CellStatus {
  /** Colours of the players who filled the cell; several colours share the cell as stripes. */
  colors: string[];
  isNow?: boolean;
  missed?: boolean;
  future?: boolean;
}

interface BoardGridProps {
  layout: GridLayout;
  statusOf: (cell: number) => CellStatus;
  labelOf: (cell: number) => string;
  onCellPress: (cell: number) => void;
  /** Shown when cells are too small to tap one by one. */
  zoomHint?: string;
}

export function BoardGrid({ layout, statusOf, labelOf, onCellPress, zoomHint }: BoardGridProps) {
  const [width, setWidth] = useState(0);
  const [zoomedRow, setZoomedRow] = useState<number | null>(null);

  const cellSize = width ? (width - LABEL_WIDTH - GAP * layout.columns) / layout.columns : 0;
  const compact = cellSize < MIN_TAP_SIZE;
  const rowHeight = Math.max(cellSize, MIN_ROW_HEIGHT);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={styles.grid}>
      {width > 0 && compact && zoomHint && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {zoomHint}
        </ThemedText>
      )}
      {width > 0 &&
        layout.rows.map((row, r) => (
          <View key={r}>
            <Pressable
              disabled={!compact}
              onPress={() => setZoomedRow(zoomedRow === r ? null : r)}
              style={styles.row}>
              <ThemedText type="code" themeColor="textSecondary" style={styles.rowLabel} numberOfLines={1}>
                {row.label}
              </ThemedText>
              {row.cells.map((cell, c) => (
                <Cell
                  key={c}
                  cell={cell}
                  width={cellSize}
                  height={compact ? rowHeight : cellSize}
                  status={cell === NO_CELL ? undefined : statusOf(cell)}
                  onPress={compact ? undefined : onCellPress}
                />
              ))}
            </Pressable>
            {compact && zoomedRow === r && (
              <ZoomedRow row={row} width={width} statusOf={statusOf} labelOf={labelOf} onCellPress={onCellPress} />
            )}
          </View>
        ))}
    </View>
  );
}

function ZoomedRow({
  row,
  width,
  statusOf,
  labelOf,
  onCellPress,
}: Omit<BoardGridProps, 'layout' | 'zoomHint'> & { row: GridRow; width: number }) {
  const { colors, definition } = useAppTheme();
  const size = (width - GAP * 2 * ZOOM_COLUMNS) / ZOOM_COLUMNS;
  return (
    <View style={[styles.zoom, { backgroundColor: colors.backgroundSelected, borderRadius: definition.radius.sm }]}>
      {row.cells
        .filter((cell) => cell !== NO_CELL)
        .map((cell) => (
          <View key={cell} style={{ margin: GAP }}>
            <Cell cell={cell} width={size} height={size} status={statusOf(cell)} onPress={onCellPress} label={labelOf(cell)} />
          </View>
        ))}
    </View>
  );
}

function Cell({
  cell,
  width,
  height,
  status,
  onPress,
  label,
}: {
  cell: number;
  width: number;
  height: number;
  status?: CellStatus;
  onPress?: (cell: number) => void;
  label?: string;
}) {
  const theme = useTheme();
  const box = { width, height, marginLeft: GAP, marginBottom: GAP };
  if (!status) return <View style={box} />;

  const { colors, isNow, missed, future } = status;
  const content = (
    <View
      style={[
        styles.cell,
        box,
        { backgroundColor: theme.cellEmpty },
        future && styles.future,
        missed && { borderWidth: 1, borderColor: theme.danger },
        isNow && { borderWidth: 2, borderColor: theme.action },
      ]}>
      {colors.map((color) => (
        <View key={color} style={[styles.stripe, { backgroundColor: color }]} />
      ))}
      {label !== undefined && (
        <View style={styles.cellLabelWrap} pointerEvents="none">
          <ThemedText type="caption" style={styles.cellLabel} numberOfLines={1}>
            {label}
          </ThemedText>
        </View>
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onPress(cell)}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hint: {
    marginBottom: Spacing.two,
  },
  rowLabel: {
    width: LABEL_WIDTH,
    fontSize: 10,
  },
  zoom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: Spacing.one,
    marginVertical: Spacing.one,
  },
  cell: {
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stripe: {
    flex: 1,
  },
  future: {
    opacity: 0.4,
  },
  cellLabelWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontSize: 9,
    lineHeight: 11,
  },
});
