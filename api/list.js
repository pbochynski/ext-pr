/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
const { graphql } = require("@octokit/graphql");
const q = "is:open is:pr org:kyma-project org:kyma-incubator archived:false";
const extPRquery = `query listPR($q: String!, $cursor: String)
{
     search(type: ISSUE, query: $q, first: 100, after: $cursor) {
       nodes {
         ... on PullRequest {
           id
           repository{
             owner {
               id
               login
             }
           }
           author {
             login
             ... on User {
               id
               email
               organizations(first: 100) {
                 totalCount
                 nodes {
                   id
                   name
                 }
               }
               name
             }
           }
           title
           url
         }
       }
       issueCount
       pageInfo {
         endCursor
         hasNextPage
       }
     }
   }
 `;

function filterExtPR(q, cursor, filtered, res) {
  graphql({
    query: extPRquery,
    q: q,
    cursor: cursor,
    headers: {
      authorization: `token ${process.env.TOKEN}`,
    },
  })
    .then((response) => {
      console.log("cursor: %s, issueCount: %s", response.search.pageInfo.endCursor, response.search.issueCount);
      response.search.nodes.forEach((pr) => {
        if (!pr.author.organizations || pr.author.organizations.nodes.every((org) => org.id != pr.repository.owner.id)) {
          if (pr.author.login != "dependabot") {
            filtered.push(pr);
          }
        }
      });
      if (response.search.pageInfo.hasNextPage) {
        filterExtPR(q, response.search.pageInfo.endCursor, filtered, res);
      } else {
        console.log("the end");
        res.json(filtered);
      }
      //console.log("response:", response.search.nodes);
    })
    .catch((e) => console.log(e));
}

module.exports = (req, res) => {
  filterExtPR(req.query.q || q, null, [], res);
};

