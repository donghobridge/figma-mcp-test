const pageSpec = $input.first().json;

const report = {
  generatedAt: new Date().toISOString(),
  pageName: pageSpec.pageName || '',
  pageNodeId: pageSpec.pageNodeId || '',
  quality: pageSpec.quality || {},
  warnings: pageSpec.warnings || [],
  coverage: pageSpec.coverage || [],
  components: (pageSpec.components || []).map((item) => ({
    order: item.order,
    component: item.component,
    sourceNodeId: item.sourceNodeId,
    figmaNode: item.figmaNode,
    mappedProps: Object.entries(item.propNodeIds || {})
      .filter(([, nodeId]) => Boolean(nodeId))
      .map(([prop, nodeId]) => ({ prop, nodeId })),
  })),
};

return [{
  json: {
    report: JSON.stringify(report, null, 2),
  },
}];
