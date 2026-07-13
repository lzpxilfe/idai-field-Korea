import {
    click,
    getLocator,
    getText,
    navigateTo,
    pause,
    readClipboardText,
    resetApp,
    scrollTo,
    sendMessageToAppController,
    setViewportSize,
    start,
    stop,
    takeElementScreenshot,
    takeScreenshot,
    typeIn,
    waitForExist
} from '../app';
import { NavbarPage } from '../navbar.page';

const { test, expect } = require('@playwright/test');
const path = require('path');

const shouldCaptureReadmeScreenshots = process.env.IDAI_FIELD_CAPTURE_README_SCREENSHOTS === '1';
const readmeImageDirectory = path.resolve(process.cwd(), '..', 'docs', 'korean-fieldwork', 'images');
const uiAuditImageDirectory = path.resolve(process.cwd(), '..', '.runtime');


async function getReportHandoffCard(identifier: string) {

    const selector = '.korean-fieldwork-report-handoff-card'
        + `:has(.korean-fieldwork-report-handoff-identifier:text-is("${identifier}"))`;

    const card = (await getLocator(selector)).first();
    const deadline = Date.now() + 5000;

    while (Date.now() < deadline) {
        if (await card.count() > 0) return card;

        const overflowButton = await getLocator('.korean-fieldwork-report-handoff-overflow');
        const collapsedOverflowIcon = overflowButton.locator('.mdi-chevron-down');
        if (await overflowButton.count() > 0 && await collapsedOverflowIcon.count() > 0) {
            await click(overflowButton.first());
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


async function expectReportHandoffWorkspaceLayout(reportPanel: any, stacked: boolean) {

    const index = reportPanel.locator('.korean-fieldwork-report-handoff-index');
    const preview = reportPanel.locator('.korean-fieldwork-report-handoff-preview');
    const [indexBox, previewBox, panelSize] = await Promise.all([
        index.boundingBox(),
        preview.boundingBox(),
        reportPanel.evaluate((element: HTMLElement) => ({
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth
        }))
    ]);

    expect(indexBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    expect(panelSize.scrollWidth).toBeLessThanOrEqual(panelSize.clientWidth + 1);

    if (stacked) {
        expect(previewBox!.y).toBeGreaterThan(indexBox!.y);
    } else {
        expect(indexBox!.x + indexBox!.width).toBeLessThanOrEqual(previewBox!.x + 1);
        expect(Math.abs(previewBox!.y - indexBox!.y)).toBeLessThanOrEqual(4);
    }
}


test.describe('Korean fieldwork report handoff', () => {

    test.beforeAll(async () => {

        await start();
    });


    test.beforeEach(async () => {

        await navigateTo('settings');
        await resetApp();
        if (shouldCaptureReadmeScreenshots) {
            await setViewportSize(1440, 960);
            await waitForExist('#tablet-handoff-project-identifier-input');
            await typeIn('#tablet-handoff-project-identifier-input', 'fieldwork-119k6d');
            const tabletReceivePanel = await getLocator('.korean-fieldwork-tablet-handoff-preparation');
            await takeElementScreenshot(
                path.join(readmeImageDirectory, 'readme-desktop-tablet-receive-settings.png'),
                tabletReceivePanel
            );
        }
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

        const recordSearch = reportPanel.locator('.korean-fieldwork-report-handoff-search input');
        await recordSearch.fill('SE6');
        await expect(recordSearch).toHaveValue('SE6');
        expect(await reportPanel.locator(
            '.korean-fieldwork-report-handoff-list .korean-fieldwork-report-handoff-identifier'
        ).allTextContents())
            .toEqual(['SE6']);
        await recordSearch.fill('');

        const soilPhotoCard = await getReportHandoffCard('1호 주거지 토층사진 12');
        await waitForExist(soilPhotoCard);
        await click(await soilPhotoCard.locator('.korean-fieldwork-report-handoff-open'));

        const reportText = await getText(reportPanel, false);
        expect(reportText).toContain('보고서/HWP 복사');
        expect(reportText).toContain('1호 주거지 토층사진 12');
        expect(reportText).toContain('HWP 본문');
        expect(reportText).toContain('본문 복사');
        expect(reportText).toContain('토층사진');
        expect(reportText).toContain('스포이드 위치');
        expect(reportText).toContain('RGB 111/87/61 @ 20%/50%');
        expect(reportText).toContain('원본 파일: 1호-주거지-토층.jpg');
        expect(reportText).toContain('1호 주거지 유물 1');
        expect(reportText).toContain('1번 35%/42% 청동편');
        expect(reportText).toContain('1호 주거지 시료 1');
        expect(reportText).toContain('1번 52%/67% 바닥면');
        expect(reportText).not.toContain('soilColorAssistCandidates');
        expect(reportText).not.toContain('fieldworkPhotoAnnotationStrokes');

        await click(await soilPhotoCard.locator('.korean-fieldwork-report-handoff-copy.body'));

        const bodyClipboardText = await readClipboardText();
        expect(bodyClipboardText).toContain('토층 단면 사진');
        expect(bodyClipboardText).toContain('1호 주거지 토층사진 12');
        expect(bodyClipboardText).toContain('원본 파일: 1호-주거지-토층.jpg');
        expect(bodyClipboardText).not.toContain('soilColorAssistCandidates');
        expect(bodyClipboardText).not.toContain('fieldworkPhotoAnnotationStrokes');

        await click(await soilPhotoCard.locator('.korean-fieldwork-report-handoff-copy').nth(1));

        const fullClipboardText = await readClipboardText();
        expect(fullClipboardText).toContain('토층사진');
        expect(fullClipboardText).toContain('스포이드 위치');
        expect(fullClipboardText).toContain('RGB 111/87/61 @ 20%/50%');
        expect(fullClipboardText).toContain('원본 파일: 1호-주거지-토층.jpg');
        expect(fullClipboardText).not.toContain('soilProfilePhotoAnnotationStrokes');
        expect(fullClipboardText).not.toContain('"strokes"');

        const featureCard = await getReportHandoffCard('1호 주거지');
        await waitForExist(featureCard);
        await click(await featureCard.locator('.korean-fieldwork-report-handoff-open'));

        const featureReportText = await getText(reportPanel, false);
        expect(featureReportText).toContain('\ud0dc\ube14\ub9bf');
        expect(featureReportText).toContain('\ucc98\ub9ac\ub300\uc0c1');
        expect(featureReportText).toContain('\ubbf8\ucc98\ub9ac');
        expect(featureReportText).toContain('1호-주거지-전경.jpg');
        expect(featureReportText).toContain('1호-주거지-토층.jpg');
        expect(featureReportText).toContain('RGB 111/87/61 @ 20%/50%');
        expect(featureReportText).toContain('유물 1');
        expect(featureReportText).toContain('시료 1');
        expect(featureReportText).toContain('1번 35%/42% 청동편');
        expect(featureReportText).toContain('1번 52%/67% 바닥면');

        const firstTabletSourceGroup = reportPanel
            .locator('.korean-fieldwork-report-handoff-tablet-bundle-source-group')
            .first();
        await click(firstTabletSourceGroup.locator('summary'));
        await click(firstTabletSourceGroup.locator(
            '.korean-fieldwork-report-handoff-tablet-bundle-source-group-copy'
        ));
        expect(await readClipboardText()).toContain('1호-주거지-전경.jpg');
        await click(firstTabletSourceGroup.locator('summary'));

        await setViewportSize(1024, 840);
        await pause(200);
        await expectReportHandoffWorkspaceLayout(reportPanel, false);
        if (shouldCaptureReadmeScreenshots) {
            await scrollTo(reportPanel);
            await takeScreenshot(path.join(uiAuditImageDirectory, 'desktop-handoff-1024.png'));
        }

        await setViewportSize(860, 900);
        await pause(200);
        await expectReportHandoffWorkspaceLayout(reportPanel, true);
        if (shouldCaptureReadmeScreenshots) {
            await scrollTo(reportPanel);
            await takeScreenshot(path.join(uiAuditImageDirectory, 'desktop-handoff-860.png'));
        }

        await setViewportSize(1440, 960);
        await pause(200);
        await expectReportHandoffWorkspaceLayout(reportPanel, false);

        if (shouldCaptureReadmeScreenshots) {
            await scrollTo(reportPanel);
            await pause(400);
            await takeScreenshot(path.join(readmeImageDirectory, 'readme-desktop-tablet-handoff.png'));
        }

        await click(await reportPanel.locator('.korean-fieldwork-report-handoff-preview-action.tablet'));

        const tabletClipboardText = await readClipboardText();
        expect(tabletClipboardText).toContain('[\ud0dc\ube14\ub9bf \uc790\ub8cc \ubb36\uc74c]');
        expect(tabletClipboardText).toContain('\uc6d0\uc790\ub8cc \ucc98\ub9ac: \ucc98\ub9ac\ub300\uc0c1');
        expect(tabletClipboardText).toContain('\ucc98\ub9ac: \ubbf8\ucc98\ub9ac');
        expect(tabletClipboardText).toContain('1호-주거지-전경.jpg');
        expect(tabletClipboardText).toContain('1호-주거지-토층.jpg');
        expect(tabletClipboardText).toContain('RGB 111/87/61 @ 20%/50%');
        expect(tabletClipboardText).toContain('1호 주거지 유물 1');
        expect(tabletClipboardText).toContain('1호 주거지 시료 1');
        expect(tabletClipboardText).toContain('1번 35%/42% 청동편');
        expect(tabletClipboardText).toContain('1번 52%/67% 바닥면');
        expect(tabletClipboardText).not.toContain('soilProfilePhotoAnnotationStrokes');
        expect(tabletClipboardText).not.toContain('"strokes"');
    });
});
