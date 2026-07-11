import {
    click,
    getLocator,
    getText,
    navigateTo,
    pause,
    readClipboardText,
    resetApp,
    sendMessageToAppController,
    start,
    stop,
    waitForExist
} from '../app';
import { NavbarPage } from '../navbar.page';

const { test, expect } = require('@playwright/test');


async function getReportHandoffCard(identifier: string) {

    const selector = '.korean-fieldwork-report-handoff-card'
        + `:has(.korean-fieldwork-report-handoff-identifier:text-is("${identifier}"))`;

    const card = (await getLocator(selector)).first();
    const deadline = Date.now() + 5000;
    let overflowClicked = false;

    while (Date.now() < deadline) {
        if (await card.count() > 0) return card;

        const overflowButton = await getLocator('.korean-fieldwork-report-handoff-overflow');
        if (!overflowClicked && await overflowButton.count() > 0) {
            await click(overflowButton.first());
            overflowClicked = true;
        }

        await pause(250);
    }

    const visibleIdentifiers = await (await getLocator('.korean-fieldwork-report-handoff-identifier'))
        .allTextContents();
    throw new Error(
        `Report handoff card "${identifier}" not found.`
        + ` Visible cards: ${visibleIdentifiers.join(' | ') || '(none)'}`
    );
}


test.describe('Korean fieldwork report handoff', () => {

    test.beforeAll(async () => {

        await start();
    });


    test.beforeEach(async () => {

        await navigateTo('settings');
        await resetApp();
        await sendMessageToAppController('seedKoreanFieldworkReportHandoff');
        await NavbarPage.clickCloseNonResourcesTab();
        await NavbarPage.clickTab('project');
    });


    test.afterAll(async () => {

        await stop();
    });


    test('copies tablet field records from the desktop HWP panel into the Electron clipboard', async () => {

        await waitForExist('.korean-fieldwork-priority-strip');
        await click(await getLocator('.korean-fieldwork-priority-strip-panel:has-text("보고서")'));

        const reportPanel = await getLocator('.korean-fieldwork-report-handoff-strip');
        await waitForExist(reportPanel);

        const soilPhotoCard = await getReportHandoffCard('토층사진 12');
        await waitForExist(soilPhotoCard);
        await click(await soilPhotoCard.locator('.korean-fieldwork-report-handoff-open'));

        const reportText = await getText(reportPanel, false);
        expect(reportText).toContain('보고서/HWP 복사');
        expect(reportText).toContain('토층사진 12');
        expect(reportText).toContain('HWP 본문');
        expect(reportText).toContain('본문 복사');
        expect(reportText).toContain('토층사진');
        expect(reportText).toContain('스포이드 위치');
        expect(reportText).toContain('RGB 111/87/61 @ 20%/50%');
        expect(reportText).toContain('원본 파일: soil-photo-12.jpg');
        expect(reportText).not.toContain('soilColorAssistCandidates');
        expect(reportText).not.toContain('fieldworkPhotoAnnotationStrokes');

        await click(await soilPhotoCard.locator('.korean-fieldwork-report-handoff-copy.body'));

        const bodyClipboardText = await readClipboardText();
        expect(bodyClipboardText).toContain('토층 단면 사진');
        expect(bodyClipboardText).toContain('토층사진 12');
        expect(bodyClipboardText).toContain('원본 파일: soil-photo-12.jpg');
        expect(bodyClipboardText).not.toContain('soilColorAssistCandidates');
        expect(bodyClipboardText).not.toContain('fieldworkPhotoAnnotationStrokes');

        await click(await soilPhotoCard.locator('.korean-fieldwork-report-handoff-copy').nth(1));

        const fullClipboardText = await readClipboardText();
        expect(fullClipboardText).toContain('토층사진');
        expect(fullClipboardText).toContain('스포이드 위치');
        expect(fullClipboardText).toContain('RGB 111/87/61 @ 20%/50%');
        expect(fullClipboardText).toContain('원본 파일: soil-photo-12.jpg');
        expect(fullClipboardText).not.toContain('soilProfilePhotoAnnotationStrokes');
        expect(fullClipboardText).not.toContain('"strokes"');

        const featureCard = await getReportHandoffCard('pit-001');
        await waitForExist(featureCard);
        await click(await featureCard.locator('.korean-fieldwork-report-handoff-open'));

        const featureReportText = await getText(reportPanel, false);
        expect(featureReportText).toContain('\ud0dc\ube14\ub9bf');
        expect(featureReportText).toContain('\ucc98\ub9ac\ub300\uc0c1');
        expect(featureReportText).toContain('\ubbf8\ucc98\ub9ac');
        expect(featureReportText).toContain('pit-001.jpg');
        expect(featureReportText).toContain('soil-photo-12.jpg');
        expect(featureReportText).toContain('RGB 111/87/61 @ 20%/50%');

        await click(await reportPanel.locator('.korean-fieldwork-report-handoff-preview-action.tablet'));

        const tabletClipboardText = await readClipboardText();
        expect(tabletClipboardText).toContain('[\ud0dc\ube14\ub9bf \uc790\ub8cc \ubb36\uc74c]');
        expect(tabletClipboardText).toContain('\uc6d0\uc790\ub8cc \ucc98\ub9ac: \ucc98\ub9ac\ub300\uc0c1');
        expect(tabletClipboardText).toContain('\ucc98\ub9ac: \ubbf8\ucc98\ub9ac');
        expect(tabletClipboardText).toContain('pit-001.jpg');
        expect(tabletClipboardText).toContain('soil-photo-12.jpg');
        expect(tabletClipboardText).toContain('RGB 111/87/61 @ 20%/50%');
        expect(tabletClipboardText).not.toContain('soilProfilePhotoAnnotationStrokes');
        expect(tabletClipboardText).not.toContain('"strokes"');
    });
});
