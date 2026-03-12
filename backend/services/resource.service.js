const resourceRepository = require('../repositories/resource.repository');

class ResourceService {
  create(payload) { return resourceRepository.create(payload); }

  async workload(projectId) {
    const resources = await resourceRepository.list(projectId);
    return resources.map((resource) => ({
      ...resource,
      workload: resource.taskLinks.reduce((sum, link) => sum + link.quantity, 0),
      remainingAvailability: Math.max(0, resource.availability - resource.taskLinks.reduce((sum, link) => sum + link.quantity, 0)),
    }));
  }
}

module.exports = new ResourceService();
