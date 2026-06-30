import { EditableMapComponent } from '../../../../src/app/components/resources/map/map/editable-map.component';
import * as fs from 'fs';
import * as path from 'path';


describe('EditableMapComponent Korean fieldwork feature placement', () => {

    it('labels feature polygon editing as flat map placement', () => {

        const component = Object.create(EditableMapComponent.prototype) as EditableMapComponent & {
            documentInEditing: any;
            selectedPolygon: any;
        };
        component.isEditing = true;
        component.documentInEditing = {
            resource: {
                category: 'Feature',
                geometry: { type: 'Polygon' },
                identifier: '1호 유구'
            }
        };
        component.selectedPolygon = {
            getLatLngs: () => [[{}, {}, {}, {}]]
        };

        expect(component.isKoreanFieldworkFeaturePlacementEditor()).toBe(true);
        expect(component.getEditorContextTitle()).toBe('유구 평면 배치');
        expect(component.getEditorContextDetail()).toBe('조사 경계 위 4점 범위');
    });


    it('keeps the desktop geometry editor framed as map placement, not a 3D overview', () => {

        const template = fs.readFileSync(
            path.resolve(__dirname, '../../../../src/app/components/resources/map/map/editable-map.html'),
            'utf8'
        );
        const styles = fs.readFileSync(
            path.resolve(__dirname, '../../../../src/app/components/resources/map/map/map.scss'),
            'utf8'
        );

        expect(template).toContain('id="map-editor-context-panel"');
        expect(template).toContain('mdi-map-marker-path');
        expect(styles).toContain('#map-editor-context-panel');
        expect(styles).toContain('top: 8px;');
        expect(`${template}\n${styles}`).not.toMatch(/3D|조감/);
    });
});
